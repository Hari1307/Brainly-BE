import { model, Schema } from "mongoose";

const UserSchema = new Schema({
    username: { type: String, unique: true },
    password: { type: String }
})

export const UserModel = model("users", UserSchema);

const ContentSchema = new Schema({
    title: String,
    link: String,
    type: String,
    userId: { ref: "users", required: true, type: Schema.Types.ObjectId }
})

export const ContentModel = model("content", ContentSchema);

const LinkSchema = new Schema({
    hash: String,
    userId: { ref: "users", required: true, type: Schema.Types.ObjectId, unique: true }
})

export const LinkModel = model("link", LinkSchema);