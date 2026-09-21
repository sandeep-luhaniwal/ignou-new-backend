import { Request, Response } from "express"
import Query from "../models/Query"

export const createQuery = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, type, message } = req.body

    if (!name || !email || !message) {
      return res.status(400).json({ message: "Name, email and message are required" })
    }

    const query = await Query.create({
      name,
      email,
      phone: phone || "",
      type: type || "contact",
      message
    })

    res.status(201).json({
      message: "Query submitted successfully. We will get back to you soon!",
      data: query
    })
  } catch (error) {
    console.error("CREATE QUERY ERROR:", error)
    res.status(500).json({ message: "Error creating inquiry" })
  }
}

export const getQueries = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const skip = (page - 1) * limit
    const type = req.query.type as string
    const status = req.query.status as string
    const search = req.query.search as string

    const query: any = {}
    if (type) query.type = type
    if (status) query.status = status
    if (search) {
      const searchRegex = new RegExp(search, "i")
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { message: searchRegex }
      ]
    }

    const total = await Query.countDocuments(query)
    const queries = await Query.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })

    res.json({
      data: queries,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("GET QUERIES ERROR:", error)
    res.status(500).json({ message: "Error fetching inquiries" })
  }
}

export const getQueryById = async (req: Request, res: Response) => {
  try {
    const query = await Query.findById(req.params.id)
    if (!query) {
      return res.status(404).json({ message: "Query not found" })
    }
    res.json(query)
  } catch (error) {
    console.error("GET QUERY BY ID ERROR:", error)
    res.status(500).json({ message: "Error fetching inquiry" })
  }
}

export const updateQueryStatus = async (req: Request, res: Response) => {
  try {
    const { status, adminReply } = req.body
    const query = await Query.findById(req.params.id)
    if (!query) {
      return res.status(404).json({ message: "Query not found" })
    }

    if (status) query.status = status
    if (adminReply !== undefined) query.adminReply = adminReply

    await query.save()
    res.json({
      message: "Query status updated successfully",
      data: query
    })
  } catch (error) {
    console.error("UPDATE QUERY STATUS ERROR:", error)
    res.status(500).json({ message: "Error updating inquiry" })
  }
}

export const deleteQuery = async (req: Request, res: Response) => {
  try {
    const query = await Query.findByIdAndDelete(req.params.id)
    if (!query) {
      return res.status(404).json({ message: "Query not found" })
    }
    res.json({ message: "Query deleted successfully" })
  } catch (error) {
    console.error("DELETE QUERY ERROR:", error)
    res.status(500).json({ message: "Error deleting inquiry" })
  }
}
