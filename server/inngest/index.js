import { Inngest } from "inngest";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import sendEmail from "../config/nodeMailer.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "movie-ticket-booking" });

// Inngest Function to save user data to a database
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;
    const userData = {
      _id: id,
      email: email_addresses[0].email_address,
      name: first_name + " " + last_name,
      image: image_url,
    };
    await User.create(userData);
  }
);

// Inngest Function to delete user data from a database
const syncUserDeletion = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { id } = event.data;
    await User.findByIdAndDelete(id);
  }
);

// Inngest Function to update user data from a database
const syncUserUpdation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;
    const userData = {
      _id: id,
      email: email_addresses[0].email_address,
      name: first_name + " " + last_name,
      image: image_url,
    };
    await User.findByIdAndUpdate(id, userData);
  }
);

// Inngest Function to cancel booking and release seats of show after 10 minutes of booking created if payment is not made
const releaseSeatsAndDeleteBooking = inngest.createFunction(
  { id: "release-seats-delete-booking" },
  { event: "app/checkpayment" },
  async ({ event, step }) => {
    const tenMinutesLater = new Date(Date.now() + 10 * 60 * 1000);
    await step.sleepUntil("wait-for-10-minutes", tenMinutesLater);

    await step.run("check-payment-status", async () => {
      const bookingId = event.data.bookingId;
      const booking = await Booking.findById(bookingId);

      // If payment is not made , release seats and delete booking
      if (!booking.isPaid) {
        const show = await Show.findById(booking.show);
        booking.bookedSeats.forEach((seat) => {
          delete show.occupiedSeats[seat];
        });
        show.markModified("occupiedSeats");
        await show.save();
        await Booking.findByIdAndDelete(booking._id);
      }
    });
  }
);

// Inngest Function to send email when use books a show
const sendBookingConformationEmail = inngest.createFunction(
  { id: "send-booking-conformation-email" },
  { event: AppContext / show.booked },
  async ({ event, step }) => {
    const { bookingId } = event.data;
    const booking = await Booking.findById(bookingId)
      .populate({
        path: "show",
        populate: { path: "movie", model: "Movie" },
      })
      .populate("user");

    await sendEmail({
      to: booking.user.email,
      subject: `Payment Conformation: "${booking.show.movie.title}" booked!`,
      body: `<div style="font-family: Arial, sans-serif; padding: 20px; background: #f4f4f4;">
          <div style="max-width: 600px; margin: auto; background: #fff; border-radius: 10px; padding: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
            
            <h2 style="text-align: center; color: #d81b60;">🎬 Booking Confirmed!</h2>
            <p style="font-size: 16px; color: #333; text-align: center;">
              Thank you for booking with <strong>CineMagic</strong>! Here are your ticket details:
            </p>

            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Movie:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">Avengers: Endgame</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Date:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">6th September 2025</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Time:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">7:30 PM</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Seats:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">Gold - G12, G13</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #ddd;"><strong>Booking ID:</strong></td>
                <td style="padding: 8px; border: 1px solid #ddd;">#CM123456</td>
              </tr>
            </table>

            <p style="text-align: center; margin-top: 20px;">
              <a href="https://your-cinema.com/tickets/CM123456" 
                 style="background: #d81b60; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px;">
                View Your Ticket 🎟️
              </a>
            </p>

            <p style="margin-top: 30px; font-size: 14px; color: #888; text-align: center;">
              Please arrive 15 minutes before the showtime. Bring a valid ID for verification.<br>
              © 2025 CineMagic. All rights reserved.
            </p>

          </div>
        </div>`,
    });
  }
);

// Inngest Function to send remainders
const sendShowRemainders = inngest.createFunction(
  { id: "send-show-remainders" },
  { cron: "0 */8 * * *" }, // Every 8 hours
  async ({ step }) => {
    const now = new Date();
    const in8Hours = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const windowStart = new Date(in8Hours.getTime() - 10 * 60 * 1000);

    // Prepare remainder tasks
    const remainderTasks = await step.run(
      "prepare-remainder-tasks",
      async () => {
        const shows = await Show.find({
          showTime: { $gte: windowStart, $lt: in8Hours },
        }).populate("movie");

        const tasks = [];

        for (const show of shows) {
          if (!show.movie || !show.occupiedSeats) {
            continue;
          }
          const userIds = [...new set(Object.values(show.occupiedSeats))];
          if (userIds.length === 0) {
            continue;
          }
          const users = await User.find({ _id: { $in: userIds } }).select(
            "name email"
          );

          for (const user of users) {
            tasks.push({
              userEmail: user.email,
              userName: user.name,
              movieTitle: show.movie.title,
              showTime: show.showTime,
            });
          }
        }
        return tasks;
      }
    );
    if (remainderTasks.length === 0) {
      return { sent: 0, message: "No reminders to send" };
    }

    // Send reminder emails
    const results = await step.run("send-all-reminders", async () => {
      return await Promise.allSettled(
        remainderTasks.map((task) =>
          sendEmail({
            to: task.userEmail,
            subject: `Reminder: "${task.movieTitle}" starts soon!`,
            body: `<div style="font-family: Arial, sans-serif; padding: 20px; background: #f4f4f4;">
                        <div style="max-width: 600px; margin: auto; background: #fff; border-radius: 10px; padding: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
                            <h2 style="text-align: center; color: #d81b60;">🎬 Reminder!</h2>
                            <p style="font-size: 16px; color: #333; text-align: center;">
                                <strong>Movie:</strong> ${task.movieTitle}<br>
                                <strong>Show Time:</strong> ${task.showTime}<br>
                                <strong>User:</strong> ${task.userName}
                            </p>
                            <p style="text-align: center; margin-top: 20px;">
                                <a href="https://your-cinema.com/tickets/CM123456" 
                                    style="background: #d81b60; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px;">
                                    View Your Ticket 🎟️
                                </a>
                            </p>
                            <p style="margin-top: 30px; font-size: 14px; color: #888; text-align: center;">
                                Please arrive 15 minutes before the showtime. Bring a valid ID for verification.<br>
                                © 2025 CineMagic. All rights reserved.
                            </p>
                        </div>
                    </div>`,
          })
        )
      );
    });

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - sent;

    return {
      sent,
      failed,
      message: `Sent ${sent} reminder(s), ${failed} failed`,
    };
  }
);

// Inngest Function to send new show notification when added
const sendNewShowNotification = inngest.createFunction(
  { id: "send-new-show-notification" },
  { event: "app/show.added" },
  async ({ event }) => {
    const { movieTitle } = event.data;

    const users = await User.find({});

    for (const user of users) {
      const userEmail = user.email;
      const userName = user.name;
      const subject = `New Show: "${movieTitle}" added!`;
      const body = `<div style="font-family: Arial, sans-serif; padding: 20px; background: #f4f4f4;">
                        <h2>Hi ${userName},</h2>
                        <p>A new show has been added to your library:</p>
                        <h3 style="color: #F84565;">${movieTitle}</h3>
                        <p>Visit our Website</p>
                        <br/>
                        <p>Thanks,<br/>QuickShow Team</p>
                    </div>`;

      await sendEmail({
        to: userEmail,
        subject,
        body,
      });
    }

    return { message: "Notification sent" };
  }
);

// Create an empty array where we'll export future Inngest functions
export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  releaseSeatsAndDeleteBooking,
  sendShowRemainders,
  sendNewShowNotification
];
