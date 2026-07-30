import express from "express"
import { createCategory, createSubCategory, getCategories, getSubCategories, getChooseCategories } from "../controllers/categoryController"
const router = express.Router()


router.post("/create", createCategory)

router.post("/sub-create", createSubCategory)

router.get("/", getCategories)

router.get("/sub", getSubCategories)

router.get("/choosecategory", getChooseCategories)


export default router