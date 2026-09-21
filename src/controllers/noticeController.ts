import { Request, Response } from "express"
import Notice from "../models/Notice"

export const getNotices = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const skip = (page - 1) * limit
    const category = req.query.category as string
    const search = req.query.search as string
    const isImportant = req.query.isImportant as string

    const query: any = { isActive: true }
    if (category && category !== "all") query.category = category
    if (isImportant === "true") query.isImportant = true
    if (search) {
      const searchRegex = new RegExp(search, "i")
      query.$or = [{ title: searchRegex }, { description: searchRegex }]
    }

    const total = await Notice.countDocuments(query)
    const notices = await Notice.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ isImportant: -1, publishDate: -1, createdAt: -1 })

    res.json({
      data: notices,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("GET NOTICES ERROR:", error)
    res.status(500).json({ message: "Error fetching notices" })
  }
}

export const getNoticeById = async (req: Request, res: Response) => {
  try {
    const notice = await Notice.findById(req.params.id)
    if (!notice) {
      return res.status(404).json({ message: "Notice not found" })
    }
    res.json(notice)
  } catch (error) {
    console.error("GET NOTICE BY ID ERROR:", error)
    res.status(500).json({ message: "Error fetching notice" })
  }
}

export const createNotice = async (req: Request, res: Response) => {
  try {
    const { title, description, link, category, isImportant, publishDate } = req.body

    if (!title) {
      return res.status(400).json({ message: "Notice title is required" })
    }

    const notice = await Notice.create({
      title,
      description,
      link,
      category: category || "general",
      isImportant: isImportant === true || isImportant === "true",
      publishDate: publishDate || new Date(),
      isActive: true
    })

    res.status(201).json(notice)
  } catch (error) {
    console.error("CREATE NOTICE ERROR:", error)
    res.status(500).json({ message: "Error creating notice" })
  }
}

export const updateNotice = async (req: Request, res: Response) => {
  try {
    const { title, description, link, category, isImportant, isActive, publishDate } = req.body
    const notice = await Notice.findById(req.params.id)

    if (!notice) {
      return res.status(404).json({ message: "Notice not found" })
    }

    if (title) notice.title = title
    if (description !== undefined) notice.description = description
    if (link !== undefined) notice.link = link
    if (category) notice.category = category
    if (isImportant !== undefined) notice.isImportant = isImportant === true || isImportant === "true"
    if (isActive !== undefined) notice.isActive = isActive === true || isActive === "true"
    if (publishDate) notice.publishDate = publishDate

    await notice.save()
    res.json(notice)
  } catch (error) {
    console.error("UPDATE NOTICE ERROR:", error)
    res.status(500).json({ message: "Error updating notice" })
  }
}

export const deleteNotice = async (req: Request, res: Response) => {
  try {
    const notice = await Notice.findByIdAndDelete(req.params.id)
    if (!notice) {
      return res.status(404).json({ message: "Notice not found" })
    }
    res.json({ message: "Notice deleted successfully" })
  } catch (error) {
    console.error("DELETE NOTICE ERROR:", error)
    res.status(500).json({ message: "Error deleting notice" })
  }
}
