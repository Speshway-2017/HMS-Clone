import { Request, Response } from "express";
import { z } from "zod";
import { BlogPost } from "../models/BlogPost";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { logAudit } from "../utils/auditLogger";
import { broadcastGlobal } from "../config/socket";

const createBlogSchema = z.object({
  title: z
    .string({ invalid_type_error: "Post Title must be valid data. Please enter valid data" })
    .trim()
    .min(1, "Post Title is required. Field is required. Please fill out this field")
    .max(150, "Post Title cannot exceed 150 characters. Too long text is not accepted. Please enter valid data")
    .refine((val) => val.length >= 2 && /^[a-zA-Z0-9\s\.\-/'&,():;!?#%+]+$/.test(val) && !/<script|javascript:|data:/i.test(val), {
      message: "Post Title contains invalid data. Invalid data not accepted. Invalid data is not accepted. Please enter valid data",
    }),
  content: z
    .string({ invalid_type_error: "Article Content must be valid data. Please enter valid data" })
    .trim()
    .min(1, "Article Content is required. Field is required. Please fill out this field")
    .max(500, "Article Content cannot exceed 500 characters. Too long text is not accepted. Please enter valid data")
    .refine((val) => val.length >= 5 && !/<script|javascript:|data:|onload=|onerror=/i.test(val) && !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(val), {
      message: "Article Content contains invalid data. Invalid data not accepted. Invalid data is not accepted. Please enter valid data",
    }),
  author: z
    .string({ invalid_type_error: "Author Designation / Name must be valid data. Please enter valid data" })
    .trim()
    .max(100, "Author Designation / Name cannot exceed 100 characters. Too long text is not accepted. Please enter valid data")
    .refine((val) => !val || (/^[a-zA-Z0-9\s\.\-/'&,():;/]+$/.test(val) && !/<script|javascript:|data:/i.test(val)), {
      message: "Author Designation / Name contains invalid data. Invalid data not accepted. Invalid data is not accepted. Please enter valid data",
    })
    .optional()
    .default("Hospital Admin"),
  coverImageUrl: z
    .string({ invalid_type_error: "Cover Image URL must be valid data. Please enter valid data" })
    .trim()
    .max(500, "Cover Image URL cannot exceed 500 characters. Too long text is not accepted. Please enter valid data")
    .refine((val) => !val || (/^https?:\/\/.+/i.test(val) && !/<script|javascript:/i.test(val)), {
      message: "Cover Image URL contains invalid data. Invalid data not accepted. Invalid data is not accepted. Please enter valid data",
    })
    .optional()
    .default(""),
  published: z.boolean().optional().default(true),
  tags: z
    .array(
      z
        .string()
        .max(50, "Tag cannot exceed 50 characters. Too long text is not accepted. Please enter valid data")
        .refine((val) => !val || (/^[a-zA-Z0-9\s\-_#]+$/.test(val) && !/<script|javascript:/i.test(val)), {
          message: "Tag contains invalid data. Invalid data not accepted. Invalid data is not accepted. Please enter valid data",
        })
    )
    .optional()
    .default([]),
});

const updateBlogSchema = z.object({
  title: z
    .string({ invalid_type_error: "Post Title must be valid data. Please enter valid data" })
    .trim()
    .min(1, "Post Title is required. Field is required. Please fill out this field")
    .max(150, "Post Title cannot exceed 150 characters. Too long text is not accepted. Please enter valid data")
    .refine((val) => val.length >= 2 && /^[a-zA-Z0-9\s\.\-/'&,():;!?#%+]+$/.test(val) && !/<script|javascript:|data:/i.test(val), {
      message: "Post Title contains invalid data. Invalid data not accepted. Invalid data is not accepted. Please enter valid data",
    })
    .optional(),
  content: z
    .string({ invalid_type_error: "Article Content must be valid data. Please enter valid data" })
    .trim()
    .min(1, "Article Content is required. Field is required. Please fill out this field")
    .max(500, "Article Content cannot exceed 500 characters. Too long text is not accepted. Please enter valid data")
    .refine((val) => val.length >= 5 && !/<script|javascript:|data:|onload=|onerror=/i.test(val) && !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(val), {
      message: "Article Content contains invalid data. Invalid data not accepted. Invalid data is not accepted. Please enter valid data",
    })
    .optional(),
  author: z
    .string({ invalid_type_error: "Author Designation / Name must be valid data. Please enter valid data" })
    .trim()
    .max(100, "Author Designation / Name cannot exceed 100 characters. Too long text is not accepted. Please enter valid data")
    .refine((val) => !val || (/^[a-zA-Z0-9\s\.\-/'&,():;/]+$/.test(val) && !/<script|javascript:|data:/i.test(val)), {
      message: "Author Designation / Name contains invalid data. Invalid data not accepted. Invalid data is not accepted. Please enter valid data",
    })
    .optional(),
  coverImageUrl: z
    .string({ invalid_type_error: "Cover Image URL must be valid data. Please enter valid data" })
    .trim()
    .max(500, "Cover Image URL cannot exceed 500 characters. Too long text is not accepted. Please enter valid data")
    .refine((val) => !val || (/^https?:\/\/.+/i.test(val) && !/<script|javascript:/i.test(val)), {
      message: "Cover Image URL contains invalid data. Invalid data not accepted. Invalid data is not accepted. Please enter valid data",
    })
    .optional(),
  published: z.boolean().optional(),
  tags: z
    .array(
      z
        .string()
        .max(50, "Tag cannot exceed 50 characters. Too long text is not accepted. Please enter valid data")
        .refine((val) => !val || (/^[a-zA-Z0-9\s\-_#]+$/.test(val) && !/<script|javascript:/i.test(val)), {
          message: "Tag contains invalid data. Invalid data not accepted. Invalid data is not accepted. Please enter valid data",
        })
    )
    .optional(),
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
  const body = createBlogSchema.parse(req.body);
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

  broadcastGlobal("blog:created", blog);

  res.status(201).json({
    status: "success",
    data: { blog },
  });
});

export const updateBlog = catchAsync(async (req: Request, res: Response) => {
  const body = updateBlogSchema.parse(req.body);
  
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

  broadcastGlobal("blog:updated", blog);

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

  broadcastGlobal("blog:deleted", { id: blog._id });

  res.status(204).send();
});
