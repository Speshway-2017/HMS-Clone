import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  content: string;
  author: string;
  coverImageUrl?: string;
  published: boolean;
  tags: string[];
  hospital: string;
  createdAt: string;
  updatedAt: string;
}

export function useBlogs(options?: { publishedOnly?: boolean; hospitalId?: string }) {
  const publishedOnly = options?.publishedOnly;
  const hospitalId = options?.hospitalId;

  return useQuery({
    queryKey: ["blogs", { publishedOnly, hospitalId }],
    queryFn: async () => {
      const params: any = {};
      if (publishedOnly) params.publishedOnly = "true";
      if (hospitalId) params.hospitalId = hospitalId;

      const res = await api.get("/blogs", { params });
      return res.data.data.blogs as BlogPost[];
    },
  });
}

export function useBlog(id?: string) {
  return useQuery({
    queryKey: ["blog", id],
    queryFn: async () => {
      if (!id) return null;
      const res = await api.get(`/blogs/${id}`);
      return res.data.data.blog as BlogPost;
    },
    enabled: !!id,
  });
}

export interface CreateBlogPayload {
  title: string;
  content: string;
  author?: string;
  coverImageUrl?: string;
  published?: boolean;
  tags?: string[];
}

export function useCreateBlog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateBlogPayload) => {
      const res = await api.post("/blogs", payload);
      return res.data.data.blog as BlogPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
    },
  });
}

export interface UpdateBlogPayload {
  title?: string;
  content?: string;
  author?: string;
  coverImageUrl?: string;
  published?: boolean;
  tags?: string[];
}

export function useUpdateBlog(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateBlogPayload) => {
      const res = await api.patch(`/blogs/${id}`, payload);
      return res.data.data.blog as BlogPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      queryClient.invalidateQueries({ queryKey: ["blog", id] });
    },
  });
}

export function useDeleteBlog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/blogs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
    },
  });
}
