import { Response, NextFunction } from "express"
import { AuthRequest } from "./authMiddleware"

export const adminOnly = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user && req.user.role.toLowerCase() === "admin") {
    next()
  } else {
    res.status(403).json({
      message: "Admin access required"
    })
  }
}