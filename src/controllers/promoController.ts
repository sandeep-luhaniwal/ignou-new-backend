import { Request, Response } from "express"
import PromoCode from "../models/PromoCode"
import { AuthRequest } from "../middleware/authMiddleware"

// Seed default promo codes into DB if collection is empty
const ensureDefaultPromos = async () => {
  try {
    const count = await PromoCode.countDocuments()
    if (count === 0) {
      await PromoCode.create([
        {
          code: "IGNOU10",
          description: "10% discount on all assignments",
          discountType: "percentage",
          discountValue: 10,
          minOrderAmount: 0,
          isActive: true
        },
        {
          code: "WELCOME50",
          description: "Flat ₹50 discount on your order",
          discountType: "flat",
          discountValue: 50,
          minOrderAmount: 50,
          isActive: true
        },
        {
          code: "IGNOU20",
          description: "20% discount on orders above ₹199",
          discountType: "percentage",
          discountValue: 20,
          minOrderAmount: 199,
          isActive: true
        },
        {
          code: "FLAT100",
          description: "Flat ₹100 discount on orders above ₹200",
          discountType: "flat",
          discountValue: 100,
          minOrderAmount: 200,
          isActive: true
        }
      ])
    }
  } catch (err) {
    console.error("Failed to seed default promo codes:", err)
  }
}

// 1. Validate promo code (Student / Public API)
export const validatePromoCode = async (req: Request, res: Response) => {
  try {
    await ensureDefaultPromos()
    const { code, subtotal } = req.body

    if (!code || typeof code !== "string") {
      return res.status(400).json({ valid: false, message: "Promo code is required" })
    }

    const cleanCode = code.trim().toUpperCase()
    const amount = Number(subtotal) || 0

    const promo = await PromoCode.findOne({ code: cleanCode })

    if (!promo) {
      return res.status(400).json({ valid: false, message: "Invalid promo code" })
    }

    // Check if promo code is active / blocked
    if (!promo.isActive) {
      return res.status(400).json({ 
        valid: false, 
        message: "This promo code is currently disabled or blocked by admin." 
      })
    }

    // Check expiration date
    if (promo.expiresAt && new Date() > new Date(promo.expiresAt)) {
      return res.status(400).json({ valid: false, message: "This promo code has expired." })
    }

    // Check usage limit
    if (promo.usageLimit && promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit) {
      return res.status(400).json({ valid: false, message: "This promo code usage limit has been reached." })
    }

    // Check minimum order amount
    if (promo.minOrderAmount && amount < promo.minOrderAmount) {
      return res.status(400).json({
        valid: false,
        message: `Minimum order amount of ₹${promo.minOrderAmount} is required to use this promo code.`
      })
    }

    // Calculate discount
    let discount = 0
    if (promo.discountType === "percentage") {
      discount = Math.round((amount * promo.discountValue) / 100)
      if (promo.maxDiscount && promo.maxDiscount > 0) {
        discount = Math.min(discount, promo.maxDiscount)
      }
    } else {
      discount = Math.min(promo.discountValue, amount)
    }

    res.json({
      valid: true,
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      discount,
      message: `${promo.code} applied successfully! You saved ₹${discount}.`
    })
  } catch (error: any) {
    console.error("VALIDATE PROMO CODE ERROR:", error)
    res.status(500).json({ valid: false, message: "Error validating promo code", error: error?.message })
  }
}

// 2. Get all promo codes (Admin)
export const getAllPromoCodesAdmin = async (req: AuthRequest, res: Response) => {
  try {
    await ensureDefaultPromos()
    const promoCodes = await PromoCode.find().sort({ createdAt: -1 })
    res.json({
      success: true,
      data: promoCodes
    })
  } catch (error: any) {
    console.error("GET PROMO CODES ADMIN ERROR:", error)
    res.status(500).json({ message: "Error fetching promo codes", error: error?.message })
  }
}

// 3. Create promo code (Admin)
export const createPromoCodeAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { 
      code, 
      description, 
      discountType, 
      discountValue, 
      minOrderAmount, 
      maxDiscount, 
      isActive, 
      usageLimit, 
      expiresAt 
    } = req.body

    if (!code || !discountValue) {
      return res.status(400).json({ message: "Code and discount value are required" })
    }

    const cleanCode = code.trim().toUpperCase()
    const existing = await PromoCode.findOne({ code: cleanCode })
    if (existing) {
      return res.status(400).json({ message: `Promo code "${cleanCode}" already exists` })
    }

    const newPromo = await PromoCode.create({
      code: cleanCode,
      description: description || "",
      discountType: discountType === "flat" ? "flat" : "percentage",
      discountValue: Number(discountValue),
      minOrderAmount: Number(minOrderAmount) || 0,
      maxDiscount: Number(maxDiscount) || 0,
      isActive: isActive === undefined ? true : Boolean(isActive),
      usageLimit: Number(usageLimit) || 0,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined
    })

    res.status(201).json({
      success: true,
      message: "Promo code created successfully",
      data: newPromo
    })
  } catch (error: any) {
    console.error("CREATE PROMO CODE ERROR:", error)
    res.status(500).json({ message: "Error creating promo code", error: error?.message })
  }
}

// 4. Update promo code (Admin)
export const updatePromoCodeAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const promo = await PromoCode.findById(id)
    if (!promo) {
      return res.status(404).json({ message: "Promo code not found" })
    }

    const { 
      code, 
      description, 
      discountType, 
      discountValue, 
      minOrderAmount, 
      maxDiscount, 
      isActive, 
      usageLimit, 
      expiresAt 
    } = req.body

    if (code) promo.code = code.trim().toUpperCase()
    if (description !== undefined) promo.description = description
    if (discountType !== undefined) promo.discountType = discountType === "flat" ? "flat" : "percentage"
    if (discountValue !== undefined) promo.discountValue = Number(discountValue)
    if (minOrderAmount !== undefined) promo.minOrderAmount = Number(minOrderAmount)
    if (maxDiscount !== undefined) promo.maxDiscount = Number(maxDiscount)
    if (isActive !== undefined) promo.isActive = Boolean(isActive)
    if (usageLimit !== undefined) promo.usageLimit = Number(usageLimit)
    if (expiresAt !== undefined) promo.expiresAt = expiresAt ? new Date(expiresAt) : undefined

    await promo.save()

    res.json({
      success: true,
      message: "Promo code updated successfully",
      data: promo
    })
  } catch (error: any) {
    console.error("UPDATE PROMO CODE ERROR:", error)
    res.status(500).json({ message: "Error updating promo code", error: error?.message })
  }
}

// 5. Toggle Active/Block status of promo code (Admin)
export const togglePromoCodeStatusAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const promo = await PromoCode.findById(id)
    if (!promo) {
      return res.status(404).json({ message: "Promo code not found" })
    }

    // Toggle status or set explicit value if provided in body
    if (typeof req.body.isActive === "boolean") {
      promo.isActive = req.body.isActive
    } else {
      promo.isActive = !promo.isActive
    }

    await promo.save()

    res.json({
      success: true,
      message: `Promo code "${promo.code}" is now ${promo.isActive ? "ACTIVE (Unblocked)" : "DISABLED (Blocked)"}`,
      data: promo
    })
  } catch (error: any) {
    console.error("TOGGLE PROMO CODE STATUS ERROR:", error)
    res.status(500).json({ message: "Error toggling promo code status", error: error?.message })
  }
}

// 6. Delete promo code (Admin)
export const deletePromoCodeAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const promo = await PromoCode.findByIdAndDelete(id)
    if (!promo) {
      return res.status(404).json({ message: "Promo code not found" })
    }
    res.json({
      success: true,
      message: `Promo code "${promo.code}" deleted successfully`
    })
  } catch (error: any) {
    console.error("DELETE PROMO CODE ERROR:", error)
    res.status(500).json({ message: "Error deleting promo code", error: error?.message })
  }
}
