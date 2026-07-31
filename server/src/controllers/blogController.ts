import { Request, Response } from "express";
import { z } from "zod";
import { BlogPost } from "../models/BlogPost";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { logAudit } from "../utils/auditLogger";

const blogSchema = z.object({
  title: z.string().min(2, "Title is required"),
  content: z.string().min(5, "Content is required"),
  author: z.string().optional().default("Hospital Admin"),
  coverImageUrl: z.string().optional().default(""),
  published: z.boolean().optional().default(true),
  tags: z.array(z.string()).optional().default([]),
});

function createSlug(title: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${base}-${Date.now().toString().slice(-4)}`;
}

export const getBlogs = catchAsync(async (req: Request, res: Response) => {
  const filter: any = {};
  if (req.hospitalFilter?.hospital) {
    filter.hospital = req.hospitalFilter.hospital;
  }
  if (req.query.publishedOnly === "true" || !req.user || req.user.role === "patient") {
    filter.published = true;
  }

  const blogs = await BlogPost.find(filter).sort({ createdAt: -1 });
  res.json({
    status: "success",
    data: { blogs },
  });
});

export const getBlog = catchAsync(async (req: Request, res: Response) => {
  const blog = await BlogPost.findOne({ _id: req.params.id });
  if (!blog) {
    throw new AppError("Blog post not found.", 404);
  }
  res.json({
    status: "success",
    data: { blog },
  });
});

export const createBlog = catchAsync(async (req: Request, res: Response) => {
  const body = blogSchema.parse(req.body);
  const hospitalId = req.hospitalFilter?.hospital || req.user?.hospital;

  if (!hospitalId) {
    throw new AppError("Hospital context required to publish blog post.", 400);
  }

  const slug = createSlug(body.title);

  const blog = await BlogPost.create({
    ...body,
    slug,
    hospital: hospitalId,
  });

  await logAudit({
    req,
    action: "CREATE_BLOG",
    entity: "BlogPost",
    entityId: blog._id.toString(),
    details: { title: blog.title, slug: blog.slug },
  });

  res.status(201).json({
    status: "success",
    data: { blog },
  });
});

export const updateBlog = catchAsync(async (req: Request, res: Response) => {
  const body = blogSchema.partial().parse(req.body);
  
  const updateData: any = { ...body };
  if (body.title) {
    updateData.slug = createSlug(body.title);
  }

  const blog = await BlogPost.findOneAndUpdate(
    { _id: req.params.id, ...req.hospitalFilter },
    updateData,
    { new: true, runValidators: true }
  );

  if (!blog) {
    throw new AppError("Blog post not found or unauthorized.", 404);
  }

  res.json({
    status: "success",
    data: { blog },
  });
});

export const deleteBlog = catchAsync(async (req: Request, res: Response) => {
  const blog = await BlogPost.findOneAndDelete({ _id: req.params.id, ...req.hospitalFilter });

  if (!blog) {
    throw new AppError("Blog post not found or unauthorized.", 404);
  }

  res.status(204).send();
});
