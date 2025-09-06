🎬 QuickShow

QuickShow is a full-stack MERN (MongoDB, Express.js, React.js, Node.js) web application for seamless movie ticket booking. It allows users to browse movies, view showtimes, book tickets, and receive email confirmations instantly.

🚀 Features

🔐 User Authentication – Sign up, login, and manage profiles

🎥 Movie Listings – Browse latest and upcoming movies with details

🕒 Showtimes & Availability – View schedules, seat layouts, and availability

🎟️ Ticket Booking System – Select seats and confirm bookings in real-time

📩 Email Confirmation – Receive booking details via email using Nodemailer

🛠️ Admin Dashboard – Manage movies, shows, and bookings

📱 Responsive Design – Works across desktop, tablet, and mobile

🏗️ Tech Stack

Frontend: React.js, React Router, TailwindCSS
Backend: Node.js, Express.js, Inngest
Database: MongoDB (Mongoose ODM)
Authentication: clerk
Email Service: Nodemailer (Gmail/SMTP)

⚙️ Installation

Clone the repository

git clone https://github.com/your-username/quickshow.git
cd quickshow


Install dependencies

Backend

cd backend
npm install


Frontend

cd frontend
npm install

## 📌 API Endpoints  

| Method | Endpoint            | Description         |
| ------ | ------------------- | ------------------- |
| POST   | /api/auth/register  | Register new user   |
| POST   | /api/auth/login     | User login          |
| GET    | /api/movies         | Get all movies      |
| GET    | /api/movies/:id     | Get movie details   |
| POST   | /api/bookings       | Create a booking    |
| GET    | /api/bookings/:id   | Get booking details |


When a user books tickets, QuickShow sends an email confirmation with:

Movie name

Date & showtime

Seat numbers


🔮 Future Enhancements

✅ QR code–based ticket scanning

✅ Movie recommendations using AI

✅ Mobile app (React Native)