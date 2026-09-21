import express from "express"
import { 
    createCategory, 
    createSubCategory, 
    getCategories, 
    getSubCategories, 
    getChooseCategories,
    getAllCategoriesList,
    getSingleCategory,
    updateCategory,
    deleteCategory,
    getFilterOptions
} from "../controllers/categoryController"
import { protect } from "../middleware/authMiddleware"
import { adminOnly } from "../middleware/adminMiddleware"

const router = express.Router()

// Public / Student endpoints
router.get("/filters", getFilterOptions)
router.get("/filter-options", getFilterOptions)
router.get("/", getCategories)
router.get("/all", getAllCategoriesList)
router.get("/sub", getSubCategories)
router.get("/choosecategory", getChooseCategories)
router.get("/:id", getSingleCategory)

// Protected / Admin endpoints
router.post("/create", protect, adminOnly, createCategory)
router.post("/sub-create", protect, adminOnly, createSubCategory)
router.put("/:id", protect, adminOnly, updateCategory)
router.delete("/:id", protect, adminOnly, deleteCategory)

export default router