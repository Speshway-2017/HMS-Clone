import { Schema, model, InferSchemaType, Types } from "mongoose";

const blogPostSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    content: { type: String, required: true },
    author: { type: String, default: "Hospital Admin" },
    coverImageUrl: { type: String, default: "" },
    published: { type: Boolean, default: true },
    tags: { type: [String], default: [] },
    hospital: { type: Schema.Types.ObjectId, ref: "Hospital", required: true },
  },
  { timestamps: true }
);

export type BlogPost = InferSchemaType<typeof blogPostSchema> & { _id: Types.ObjectId };
export const BlogPost = model("BlogPost", blogPostSchema);
