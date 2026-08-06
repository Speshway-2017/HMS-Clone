import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, FileText, CheckCircle2, XCircle } from "lucide-react";
import { useBlogs, useDeleteBlog } from "../../features/blogs";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import toast from "react-hot-toast";
import { ConfirmDeleteModal } from "../../components/ui/ConfirmDeleteModal";

export function BlogsPage() {
  const navigate = useNavigate();
  const { data: blogs = [], isLoading } = useBlogs();
  const deleteBlog = useDeleteBlog();
  const [selectedTag, setSelectedTag] = useState<string>("all");

  const allTags = Array.from(new Set(blogs.flatMap((b) => b.tags || [])));

  const filteredBlogs = blogs.filter((b) => {
    if (selectedTag === "all") return true;
    return b.tags?.includes(selectedTag);
  });

  const [deleteTargetBlog, setDeleteTargetBlog] = useState<{ id: string; title: string } | null>(null);

  const handleDelete = (id: string, title: string) => {
    setDeleteTargetBlog({ id, title });
  };

  const confirmDeleteBlog = async () => {
    if (!deleteTargetBlog) return;
    try {
      await deleteBlog.mutateAsync(deleteTargetBlog.id);
      toast.success("Blog post deleted successfully.");
    } catch {
      toast.error("Failed to delete blog post.");
    } finally {
      setDeleteTargetBlog(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Blog Posts</h1>
          <p className="text-sm text-slate-500">
            Publish health news, clinical updates, and medical advice articles for public visitors.
          </p>
        </div>
        <Link to="/admin/blogs/new">
          <Button variant="primary" className="bg-navy-700 hover:bg-navy-800">
            <Plus className="h-4 w-4 mr-2" /> Write New Post
          </Button>
        </Link>
      </div>

      {allTags.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <span className="text-xs font-semibold text-slate-500 mr-2">Filter by tag:</span>
          <button
            onClick={() => setSelectedTag("all")}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
              selectedTag === "all"
                ? "bg-navy-700 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All ({blogs.length})
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                selectedTag === tag
                  ? "bg-navy-700 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Loading blog posts...</div>
      ) : filteredBlogs.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-700">No blog posts found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Get started by writing your hospital's first clinical update or patient health advisory post.
          </p>
          <div className="mt-6">
            <Link to="/admin/blogs/new">
              <Button variant="primary" className="bg-navy-700">
                <Plus className="h-4 w-4 mr-2" /> Create First Post
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredBlogs.map((post) => (
            <div
              key={post._id}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between overflow-hidden hover:shadow-md transition-shadow"
            >
              {post.coverImageUrl ? (
                <img
                  src={post.coverImageUrl}
                  alt={post.title}
                  className="h-44 w-full object-cover"
                />
              ) : (
                <div className="h-44 w-full bg-slate-100 flex items-center justify-center text-slate-300">
                  <FileText className="h-10 w-10" />
                </div>
              )}

              <div className="p-5 flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                      post.published
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {post.published ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" /> Published
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3" /> Draft
                      </>
                    )}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {new Date(post.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-850 line-clamp-2">{post.title}</h3>
                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  {post.content}
                </p>

                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {post.tags.map((t, i) => (
                      <span key={i} className="text-[10px] bg-slate-100 text-slate-600 rounded px-2 py-0.5">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 p-4 bg-slate-50 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Author: {post.author}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/admin/blogs/edit/${post._id}`)}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-navy-700 hover:border-navy-200 shadow-2xs"
                    title="Edit post"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(post._id, post.title)}
                    className="p-1.5 rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 shadow-2xs"
                    title="Delete post"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={Boolean(deleteTargetBlog)}
        title="Confirm Deletion"
        message={`Are you sure you want to delete "${deleteTargetBlog?.title || "this blog post"}"? This action cannot be undone.`}
        isLoading={deleteBlog.isPending}
        onClose={() => setDeleteTargetBlog(null)}
        onConfirm={confirmDeleteBlog}
      />
    </div>
  );
}
