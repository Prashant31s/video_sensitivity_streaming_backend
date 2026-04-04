import multer from "multer";

export function notFoundHandler(_req, res) {
  res.status(404).json({ message: "Route not found." });
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message });
  }

  const statusCode = err.statusCode ?? 500;
  return res.status(statusCode).json({
    message: err.message ?? "Internal server error.",
    details: err.details ?? undefined
  });
}
