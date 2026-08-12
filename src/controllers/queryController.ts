import { Request, Response } from "express"
import Query from "../models/Query"

export const createQuery = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, type, message } = req.body

    if (!name || !email || !type || !message) {
      return res.status(400).json({ message: "All fields are required" })
    }

    const query = await Query.create({
      name,
      email,
      phone,
      type,
      message
    })

    res.status(201).json(query)
  } catch (error) {
    console.error("CREATE QUERY ERROR:", error)
    res.status(500).json({ message: "Error creating inquiry" })
  }
}

export const getQueries = async (req: Request, res: Response) => {
  try {
    const queries = await Query.find().sort({ createdAt: -1 })
    res.json(queries)
  } catch (error) {
    console.error("GET QUERIES ERROR:", error)
    res.status(500).json({ message: "Error fetching inquiries" })
  }
}
