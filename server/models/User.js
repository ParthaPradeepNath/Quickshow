import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
    {
        _id: {type: String, required: true},
        name: {type: String, required: true},
        email: {type: String, required: true},
        mage: {type: String, required: true},
    }
)

 const User = mongoose.model("User", userSchema);

 export default User;