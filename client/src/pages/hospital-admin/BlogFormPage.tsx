import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { useBlog, useCreateBlog, useUpdateBlog } from "../../features/blogs";
import { InputField, TextareaField } from "../../components/ui/Field";
import { FileUpload } from "../../components/ui/FileUpload";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import toast from "react-hot-toast";

const BLOG_LIMITS = {
  TITLE: 150,
  AUTHOR: 100,
  TAGS: 150,
  CONTENT: 500,
  COVER_IMAGE: 500,
} as const;

// Patterns for valid data
const BLOG_TITLE_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9\s\.\-/'&,():;!?#%+]*$/;
const BLOG_AUTHOR_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9\s\.\-/'&,():;/]*$/;
const BLOG_TAGS_REGEX = /^[a-zA-Z0-9\s,\-_#]+$/;
const SCRIPT_INJECTION_REGEX = /<script|javascript:|data:text\/html|<iframe|<object|<embed|onload\s*=|onerror\s*=/i;

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

  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (blog) {
      setForm({
        title: blog.title || "",
        content: blog.content || "",
        author: blog.author || "Hospital Admin",
        coverImageUrl: blog.coverImageUrl || "",
        published: blog.published ?? true,
        tagsInput: blog.tags ? blog.tags.join(", ") : "",
      });
      const errs: Record<string, string | undefined> = {};
      const tErr = validateField("title", blog.title || "");
      if (tErr) errs.title = tErr;
      const cErr = validateField("content", blog.content || "");
      if (cErr) errs.content = cErr;
      if (blog.author) {
        const aErr = validateField("author", blog.author);
        if (aErr) errs.author = aErr;
      }
      if (blog.tags && blog.tags.length > 0) {
        const tgErr = validateField("tagsInput", blog.tags.join(", "));
        if (tgErr) errs.tagsInput = tgErr;
      }
      setFieldErrors(errs);
    }
  }, [blog]);

  const validateField = (
    field: "title" | "author" | "tagsInput" | "coverImageUrl" | "content",
    value: string
  ): string | undefined => {
    const valStr = value || "";
    const trimmed = valStr.trim();

    if (field === "title") {
      if (!trimmed) {
        return "Post Title is required. Field is required. Please fill out this field";
      }
      if (valStr.length > BLOG_LIMITS.TITLE) {
        return `Post Title cannot exceed ${BLOG_LIMITS.TITLE} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (trimmed.length < 2 || !BLOG_TITLE_REGEX.test(trimmed) || SCRIPT_INJECTION_REGEX.test(trimmed)) {
        return "Post Title contains invalid data. Invalid data not accepted. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    if (field === "author") {
      if (!trimmed) {
        return undefined; // Optional
      }
      if (valStr.length > BLOG_LIMITS.AUTHOR) {
        return `Author Designation / Name cannot exceed ${BLOG_LIMITS.AUTHOR} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (!BLOG_AUTHOR_REGEX.test(trimmed) || SCRIPT_INJECTION_REGEX.test(trimmed)) {
        return "Author Designation / Name contains invalid data. Invalid data not accepted. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    if (field === "tagsInput") {
      if (!trimmed) {
        return undefined; // Optional
      }
      if (valStr.length > BLOG_LIMITS.TAGS) {
        return `Category Tags cannot exceed ${BLOG_LIMITS.TAGS} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (!BLOG_TAGS_REGEX.test(trimmed) || SCRIPT_INJECTION_REGEX.test(trimmed)) {
        return "Category Tags contain invalid data. Invalid data not accepted. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    if (field === "coverImageUrl") {
      if (!trimmed) {
        return undefined; // Optional
      }
      if (valStr.length > BLOG_LIMITS.COVER_IMAGE) {
        return `Cover Image URL cannot exceed ${BLOG_LIMITS.COVER_IMAGE} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (!/^https?:\/\/.+/i.test(trimmed) || SCRIPT_INJECTION_REGEX.test(trimmed)) {
        return "Cover Image URL contains invalid data. Invalid data not accepted. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    if (field === "content") {
      if (!trimmed) {
        return "Article Content is required. Field is required. Please fill out this field";
      }
      if (valStr.length > BLOG_LIMITS.CONTENT) {
        return `Article Content cannot exceed ${BLOG_LIMITS.CONTENT} characters. Too long text is not accepted. Please enter valid data`;
      }
      if (trimmed.length < 5 || SCRIPT_INJECTION_REGEX.test(trimmed) || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(trimmed)) {
        return "Article Content contains invalid data. Invalid data not accepted. Invalid data is not accepted. Please enter valid data";
      }
      return undefined;
    }

    return undefined;
  };

  const handleKeyGuard = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    currentLen: number,
    limit: number,
    label: string
  ) => {
    const allowedNavKeys = [
      "Backspace",
      "Delete",
      "Tab",
      "Escape",
      "Enter",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
    ];
    if (allowedNavKeys.includes(e.key) || e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }

    const input = e.currentTarget;
    const hasSelection = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0) > 0;
    if (!hasSelection && currentLen >= limit) {
      e.preventDefault();
      const msg = `${label} cannot exceed ${limit} characters. Too long text is not accepted. Please enter valid data`;
      setError(msg);
      toast.error(msg, { id: `${label}-limit` });
    }
  };

  const handlePasteGuard = (
    e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    currentLen: number,
    limit: number,
    label: string
  ) => {
    const pasted = e.clipboardData.getData("text") || "";
    const input = e.currentTarget;
    const selectionLen = (input.selectionEnd ?? 0) - (input.selectionStart ?? 0);
    const projectedLen = currentLen - selectionLen + pasted.length;

    if (projectedLen > limit) {
      e.preventDefault();
      const allowedLen = Math.max(0, limit - (currentLen - selectionLen));
      const truncatedPaste = pasted.slice(0, allowedLen);
      document.execCommand("insertText", false, truncatedPaste);
      const msg = `${label} cannot exceed ${limit} characters. Too long text is not accepted. Please enter valid data`;
      setError(msg);
      toast.error(msg, { id: `${label}-limit` });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const titleErr = validateField("title", form.title);
    const authorErr = validateField("author", form.author);
    const tagsErr = validateField("tagsInput", form.tagsInput);
    const coverErr = validateField("coverImageUrl", form.coverImageUrl);
    const contentErr = validateField("content", form.content);

    const errors: Record<string, string | undefined> = {
      title: titleErr,
      author: authorErr,
      tagsInput: tagsErr,
      coverImageUrl: coverErr,
      content: contentErr,
    };

    setFieldErrors(errors);

    const firstError = Object.values(errors).find(Boolean);
    if (firstError) {
      setError(firstError);
      toast.error(firstError);
      return;
    }

    const tags = form.tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      author: form.author.trim() || "Hospital Admin",
      coverImageUrl: form.coverImageUrl.trim(),
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
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {error && (
            <div
              role="alert"
              className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-semibold flex items-center gap-2"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <InputField
            label="Post Title *"
            required
            maxLength={BLOG_LIMITS.TITLE}
            showCharCount={true}
            value={form.title}
            error={fieldErrors.title}
            onKeyDown={(e) => handleKeyGuard(e, form.title.length, BLOG_LIMITS.TITLE, "Post Title")}
            onPaste={(e) => handlePasteGuard(e, form.title.length, BLOG_LIMITS.TITLE, "Post Title")}
            onChange={(e) => {
              const val = e.target.value;
              setForm((prev) => ({ ...prev, title: val }));
              const err = validateField("title", val);
              setFieldErrors((prev) => ({ ...prev, title: err }));
              if (err) setError(err);
              else if (error && error.includes("Post Title")) setError(null);
            }}
            onBlur={() => {
              const err = validateField("title", form.title);
              setFieldErrors((prev) => ({ ...prev, title: err }));
              if (err) setError(err);
            }}
            placeholder="e.g. 5 Crucial Wellness Tips for Seasonal Flu Prevention"
          />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <InputField
              label="Author Designation / Name"
              maxLength={BLOG_LIMITS.AUTHOR}
              showCharCount={true}
              value={form.author}
              error={fieldErrors.author}
              onKeyDown={(e) => handleKeyGuard(e, form.author.length, BLOG_LIMITS.AUTHOR, "Author Designation / Name")}
              onPaste={(e) => handlePasteGuard(e, form.author.length, BLOG_LIMITS.AUTHOR, "Author Designation / Name")}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({ ...prev, author: val }));
                const err = validateField("author", val);
                setFieldErrors((prev) => ({ ...prev, author: err }));
                if (err) setError(err);
                else if (error && error.includes("Author Designation / Name")) setError(null);
              }}
              onBlur={() => {
                const err = validateField("author", form.author);
                setFieldErrors((prev) => ({ ...prev, author: err }));
                if (err) setError(err);
              }}
              placeholder="e.g. Dr. Sarah Jenkins / Clinical Desk"
            />

            <InputField
              label="Category Tags (comma-separated)"
              maxLength={BLOG_LIMITS.TAGS}
              showCharCount={true}
              value={form.tagsInput}
              error={fieldErrors.tagsInput}
              onKeyDown={(e) => handleKeyGuard(e, form.tagsInput.length, BLOG_LIMITS.TAGS, "Category Tags")}
              onPaste={(e) => handlePasteGuard(e, form.tagsInput.length, BLOG_LIMITS.TAGS, "Category Tags")}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({ ...prev, tagsInput: val }));
                const err = validateField("tagsInput", val);
                setFieldErrors((prev) => ({ ...prev, tagsInput: err }));
                if (err) setError(err);
                else if (error && error.includes("Category Tags")) setError(null);
              }}
              onBlur={() => {
                const err = validateField("tagsInput", form.tagsInput);
                setFieldErrors((prev) => ({ ...prev, tagsInput: err }));
                if (err) setError(err);
              }}
              placeholder="e.g. Cardiology, Wellness, Pediatrics"
            />
          </div>

          <div>
            <FileUpload
              label="Cover Image"
              folder="blog-covers"
              value={form.coverImageUrl}
              error={fieldErrors.coverImageUrl}
              onChange={(url) => {
                setForm((prev) => ({ ...prev, coverImageUrl: url }));
                const err = validateField("coverImageUrl", url);
                setFieldErrors((prev) => ({ ...prev, coverImageUrl: err }));
                if (err) setError(err);
                else if (error && error.includes("Cover Image")) setError(null);
              }}
            />
          </div>

          <TextareaField
            label="Article Content *"
            required
            rows={10}
            maxLength={BLOG_LIMITS.CONTENT}
            showCharCount={true}
            value={form.content}
            error={fieldErrors.content}
            onKeyDown={(e) => handleKeyGuard(e, form.content.length, BLOG_LIMITS.CONTENT, "Article Content")}
            onPaste={(e) => handlePasteGuard(e, form.content.length, BLOG_LIMITS.CONTENT, "Article Content")}
            onChange={(e) => {
              const val = e.target.value;
              setForm((prev) => ({ ...prev, content: val }));
              const err = validateField("content", val);
              setFieldErrors((prev) => ({ ...prev, content: err }));
              if (err) setError(err);
              else if (error && error.includes("Article Content")) setError(null);
            }}
            onBlur={() => {
              const err = validateField("content", form.content);
              setFieldErrors((prev) => ({ ...prev, content: err }));
              if (err) setError(err);
            }}
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
