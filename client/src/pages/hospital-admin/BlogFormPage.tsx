import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useBlog, useCreateBlog, useUpdateBlog } from "../../features/blogs";
import { InputField, TextareaField } from "../../components/ui/Field";
import { FileUpload } from "../../components/ui/FileUpload";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import toast from "react-hot-toast";

export function BlogFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { data: blog } = useBlog(id);

  const createBlog = useCreateBlog();
  const updateBlog = useUpdateBlog(id ?? "");

  const [form, setForm] = useState({
    title: "",
    content: "",
    author: "Hospital Admin",
    coverImageUrl: "",
    published: true,
    tagsInput: "",
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (blog) {
      setForm({
        title: blog.title,
        content: blog.content,
        author: blog.author || "Hospital Admin",
        coverImageUrl: blog.coverImageUrl || "",
        published: blog.published,
        tagsInput: blog.tags ? blog.tags.join(", ") : "",
      });
    }
  }, [blog]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const tags = form.tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    const payload = {
      title: form.title,
      content: form.content,
      author: form.author,
      coverImageUrl: form.coverImageUrl,
      published: form.published,
      tags,
    };

    try {
      if (isEdit) {
        await updateBlog.mutateAsync(payload);
        toast.success("Blog post updated successfully.");
      } else {
        await createBlog.mutateAsync(payload);
        toast.success("Blog post published successfully.");
      }
      navigate("/admin/blogs");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to save blog post.";
      setError(msg);
      toast.error(msg);
    }
  };

  const isSaving = createBlog.isPending || updateBlog.isPending;

  return (
    <div className="w-full space-y-6 max-w-4xl mx-auto">
      <div>
        <Link to="/admin/blogs" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-700 mb-2">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Blog Posts
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">
          {isEdit ? "Edit Blog Post" : "Create New Blog Post"}
        </h1>
        <p className="text-sm text-slate-500">
          Fill in the article details below to publish health advisories and clinical news.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-semibold">{error}</div>}

          <InputField
            label="Post Title *"
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. 5 Crucial Wellness Tips for Seasonal Flu Prevention"
          />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <InputField
              label="Author Designation / Name"
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
              placeholder="e.g. Dr. Sarah Jenkins / Clinical Desk"
            />

            <InputField
              label="Category Tags (comma-separated)"
              value={form.tagsInput}
              onChange={(e) => setForm({ ...form, tagsInput: e.target.value })}
              placeholder="e.g. Cardiology, Wellness, Pediatrics"
            />
          </div>

          <div>
            <FileUpload
              label="Cover Image"
              folder="blog-covers"
              value={form.coverImageUrl}
              onChange={(url) => setForm({ ...form, coverImageUrl: url })}
            />
          </div>

          <TextareaField
            label="Article Content *"
            required
            rows={10}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="Write the full blog post text here..."
          />

          <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
            <input
              type="checkbox"
              id="published"
              checked={form.published}
              onChange={(e) => setForm({ ...form, published: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-navy-600 focus:ring-navy-500 cursor-pointer"
            />
            <label htmlFor="published" className="text-xs font-bold text-slate-700 cursor-pointer">
              Publish immediately on public website
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => navigate("/admin/blogs")}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="bg-navy-700 hover:bg-navy-800" disabled={isSaving}>
              {isSaving ? "Saving..." : isEdit ? "Update Post" : "Publish Post"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
