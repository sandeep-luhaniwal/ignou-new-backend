import mongooseModule from "mongoose"
import dotenv from "dotenv"
import bcrypt from "bcryptjs"
import dns from "dns"

import User from "./models/User"
import Category from "./models/Category"
import Product from "./models/Product"
import Order from "./models/Order"
import Query from "./models/Query"
import Notice from "./models/Notice"
import Comment from "./models/commentModel"
import PromoCode from "./models/PromoCode"

dotenv.config()

// Force DNS servers for Mongo Atlas SRV resolution
dns.setServers(["8.8.8.8", "8.8.4.4"])

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI as string
    console.log("Connecting to MongoDB for seeding...")
    await mongooseModule.connect(mongoUri)
    console.log("Connected to MongoDB successfully!")

    console.log("Cleaning up existing dummy data...")
    // Clean up collections
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
      Query.deleteMany({}),
      Notice.deleteMany({}),
      Comment.deleteMany({}),
      PromoCode.deleteMany({})
    ])
    console.log("Old data cleared.")

    // 1. CREATE USERS (Admin + Students)
    console.log("Creating Users...")
    const adminPassword = await bcrypt.hash("Admin@123", 10)
    const userPassword = await bcrypt.hash("User@123", 10)

    const admin = await User.create({
      name: "IGNOU Admin",
      email: "admin@ignoupower.shop",
      password: adminPassword,
      role: "admin",
      enrolmentNo: "ADMIN001",
      program: "ADMIN",
      session: "2024-25"
    })

    const student1 = await User.create({
      name: "Rahul Sharma",
      email: "rahul.sharma@example.com",
      password: userPassword,
      role: "user",
      enrolmentNo: "2100845123",
      program: "BCA",
      session: "July 2024"
    })

    const student2 = await User.create({
      name: "Priya Verma",
      email: "priya.verma@example.com",
      password: userPassword,
      role: "user",
      enrolmentNo: "2201948372",
      program: "MCA",
      session: "Jan 2024"
    })

    const student3 = await User.create({
      name: "Amit Patel",
      email: "amit.patel@example.com",
      password: userPassword,
      role: "user",
      enrolmentNo: "2304859102",
      program: "MBA",
      session: "July 2024"
    })

    const student4 = await User.create({
      name: "Neha Gupta",
      email: "neha.gupta@example.com",
      password: userPassword,
      role: "user",
      enrolmentNo: "2205849301",
      program: "BCOMG",
      session: "Jan 2025"
    })

    console.log("Users created!")

    // 2. CREATE CATEGORIES & SUBCATEGORIES
    console.log("Creating Categories & Subcategories...")
    const catBachelor = await Category.create({ name: "bachelor degree" })
    const catMaster = await Category.create({ name: "master degree" })
    const catDiploma = await Category.create({ name: "diploma programmes" })
    const catCertificate = await Category.create({ name: "certificate programmes" })

    // Subcategories under Bachelor Degree
    const subBCA = await Category.create({ name: "bca", parent: catBachelor._id })
    const subBCOMG = await Category.create({ name: "bcomg", parent: catBachelor._id })
    const subBAG = await Category.create({ name: "bag", parent: catBachelor._id })
    const subBSCG = await Category.create({ name: "bscg", parent: catBachelor._id })

    // Subcategories under Master Degree
    const subMCA = await Category.create({ name: "mca", parent: catMaster._id })
    const subMBA = await Category.create({ name: "mba", parent: catMaster._id })
    const subMCOM = await Category.create({ name: "mcom", parent: catMaster._id })
    const subMAENG = await Category.create({ name: "meg", parent: catMaster._id })

    // Subcategories under Diploma
    const subPGDCA = await Category.create({ name: "pgdca", parent: catDiploma._id })
    const subDECE = await Category.create({ name: "dece", parent: catDiploma._id })

    console.log("Categories created!")

    // 3. CREATE PROMO CODES (Active + Blocked / Inactive)
    console.log("Creating Promo Codes...")
    await PromoCode.create([
      {
        code: "IGNOU10",
        description: "10% discount on all solved assignments",
        discountType: "percentage",
        discountValue: 10,
        minOrderAmount: 0,
        maxDiscount: 100,
        isActive: true,
        usageLimit: 500,
        usedCount: 24
      },
      {
        code: "WELCOME50",
        description: "Flat ₹50 OFF on your first purchase",
        discountType: "flat",
        discountValue: 50,
        minOrderAmount: 50,
        isActive: true,
        usageLimit: 1000,
        usedCount: 156
      },
      {
        code: "IGNOU20",
        description: "Special 20% discount on orders above ₹199",
        discountType: "percentage",
        discountValue: 20,
        minOrderAmount: 199,
        maxDiscount: 200,
        isActive: true,
        usageLimit: 200,
        usedCount: 42
      },
      {
        code: "FLAT100",
        description: "Flat ₹100 OFF on orders above ₹200",
        discountType: "flat",
        discountValue: 100,
        minOrderAmount: 200,
        isActive: true,
        usageLimit: 100,
        usedCount: 18
      },
      {
        code: "EXPIRED50",
        description: "Old Season 50% discount (Blocked / Inactive demo)",
        discountType: "percentage",
        discountValue: 50,
        minOrderAmount: 100,
        isActive: false, // Blocked / Disabled
        usageLimit: 50,
        usedCount: 50,
        expiresAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      },
      {
        code: "BLOCKEDCODE",
        description: "Deactivated promo code for demo testing",
        discountType: "flat",
        discountValue: 75,
        minOrderAmount: 150,
        isActive: false // Blocked
      }
    ])
    console.log("Promo codes created!")

    // 4. CREATE PRODUCTS / SOLVED ASSIGNMENTS
    console.log("Creating Products / Assignments...")
    const dummyImage = "https://images.unsplash.com/photo-1532012164546-f432f2e37b73?auto=format&fit=crop&w=600&q=80"
    const samplePdfUrl = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
    const sampleQuestionUrl = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"

    const products = await Product.create([
      // BCA Assignments
      {
        title: "MCS-011 Problem Solving and Programming Solved Assignment 2024-25",
        code: "MCS-011",
        price: 49,
        oldPrice: 99,
        category: catBachelor._id,
        subCategory: subBCA._id,
        program: "BCA",
        semester: "1st Semester",
        year: "2024-25",
        session: "2024-25",
        productType: "assignment",
        description: "Complete solved assignment for IGNOU BCA MCS-011 with verified code and detailed step-by-step algorithms. 100% submission ready with question paper and title page included.",
        image: dummyImage,
        fileUrl: samplePdfUrl,
        questionPaperUrl: sampleQuestionUrl,
        questionPageUrl: sampleQuestionUrl,
        rating: 4.9,
        reviews: 28,
        isFeatured: true,
        inStock: true
      },
      {
        title: "MCS-012 Computer Organization and Assembly Language Solved Assignment 2024-25",
        code: "MCS-012",
        price: 49,
        oldPrice: 89,
        category: catBachelor._id,
        subCategory: subBCA._id,
        program: "BCA",
        semester: "1st Semester",
        year: "2024-25",
        session: "2024-25",
        productType: "assignment",
        description: "Fully solved assignment of MCS-012 with architecture block diagrams, assembly code snippets, and verified numerical solutions.",
        image: dummyImage,
        fileUrl: samplePdfUrl,
        questionPaperUrl: sampleQuestionUrl,
        questionPageUrl: sampleQuestionUrl,
        rating: 4.8,
        reviews: 19,
        isFeatured: true,
        inStock: true
      },
      {
        title: "MCS-013 Discrete Mathematics Solved Assignment 2024-25",
        code: "MCS-013",
        price: 49,
        oldPrice: 99,
        category: catBachelor._id,
        subCategory: subBCA._id,
        program: "BCA",
        semester: "1st Semester",
        year: "2024-25",
        session: "2024-25",
        productType: "assignment",
        description: "High quality mathematical proofs, truth tables, and graph theory solutions prepared by subject matter experts.",
        image: dummyImage,
        fileUrl: samplePdfUrl,
        questionPaperUrl: sampleQuestionUrl,
        questionPageUrl: sampleQuestionUrl,
        rating: 4.7,
        reviews: 15,
        isFeatured: false,
        inStock: true
      },
      {
        title: "BCS-053 Web Programming Handwritten Hardcopy Assignment 2024-25",
        code: "BCS-053",
        price: 249,
        oldPrice: 399,
        category: catBachelor._id,
        subCategory: subBCA._id,
        program: "BCA",
        semester: "5th Semester",
        year: "2024-25",
        session: "2024-25",
        productType: "handwritten",
        description: "Neat, clean, and beautiful handwriting on standard A4 one-side ruled sheets. Delivered directly to your doorstep via Speed Post.",
        image: dummyImage,
        fileUrl: samplePdfUrl,
        questionPaperUrl: sampleQuestionUrl,
        questionPageUrl: sampleQuestionUrl,
        rating: 5.0,
        reviews: 34,
        isFeatured: true,
        inStock: true
      },
      {
        title: "BCSP-064 BCA Major Project Synopsis & Report with Source Code",
        code: "BCSP-064",
        price: 999,
        oldPrice: 1999,
        category: catBachelor._id,
        subCategory: subBCA._id,
        program: "BCA",
        semester: "6th Semester",
        year: "2024-25",
        session: "2024-25",
        productType: "project",
        description: "Complete BCA final year project with approved synopsis format, SRS document, ER diagram, DFD, source code in React & Node.js, and viva question guide.",
        image: dummyImage,
        fileUrl: samplePdfUrl,
        questionPaperUrl: sampleQuestionUrl,
        questionPageUrl: sampleQuestionUrl,
        rating: 4.9,
        reviews: 42,
        isFeatured: true,
        inStock: true
      },

      // MCA Assignments
      {
        title: "MCS-211 Design and Analysis of Algorithms Solved Assignment 2024-25",
        code: "MCS-211",
        price: 59,
        oldPrice: 120,
        category: catMaster._id,
        subCategory: subMCA._id,
        program: "MCA",
        semester: "1st Semester",
        year: "2024-25",
        session: "2024-25",
        productType: "assignment",
        description: "Comprehensive solutions including asymptotic notations, dynamic programming, divide and conquer, and greedy algorithm proofs.",
        image: dummyImage,
        fileUrl: samplePdfUrl,
        questionPaperUrl: sampleQuestionUrl,
        questionPageUrl: sampleQuestionUrl,
        rating: 4.9,
        reviews: 22,
        isFeatured: true,
        inStock: true
      },
      {
        title: "MCS-212 Discrete Mathematics and Data Structures Solved Assignment 2024-25",
        code: "MCS-212",
        price: 59,
        oldPrice: 110,
        category: catMaster._id,
        subCategory: subMCA._id,
        program: "MCA",
        semester: "1st Semester",
        year: "2024-25",
        session: "2024-25",
        productType: "assignment",
        description: "Accurate step-by-step solutions for trees, graphs, sorting complexities, and sets theory.",
        image: dummyImage,
        fileUrl: samplePdfUrl,
        questionPaperUrl: sampleQuestionUrl,
        questionPageUrl: sampleQuestionUrl,
        rating: 4.8,
        reviews: 14,
        isFeatured: false,
        inStock: true
      },
      {
        title: "MCSP-232 MCA Final Semester Project Synopsis & Report",
        code: "MCSP-232",
        price: 1499,
        oldPrice: 2999,
        category: catMaster._id,
        subCategory: subMCA._id,
        program: "MCA",
        semester: "4th Semester",
        year: "2024-25",
        session: "2024-25",
        productType: "project",
        description: "Full MCA Major Project with AI/ML or Web application backend, project documentation, test cases, viva questions, and guide profile support.",
        image: dummyImage,
        fileUrl: samplePdfUrl,
        questionPaperUrl: sampleQuestionUrl,
        questionPageUrl: sampleQuestionUrl,
        rating: 5.0,
        reviews: 50,
        isFeatured: true,
        inStock: true
      },

      // B.COM / BAG / MBA
      {
        title: "BCOLA-138 Business Communication Solved Assignment 2024-25",
        code: "BCOLA-138",
        price: 45,
        oldPrice: 90,
        category: catBachelor._id,
        subCategory: subBCOMG._id,
        program: "BCOMG",
        semester: "2nd Semester",
        year: "2024-25",
        session: "2024-25",
        productType: "assignment",
        description: "High score solved assignment for BCOLA-138. Includes all essay and short answer questions formatted strictly per IGNOU guidelines.",
        image: dummyImage,
        fileUrl: samplePdfUrl,
        questionPaperUrl: sampleQuestionUrl,
        questionPageUrl: sampleQuestionUrl,
        rating: 4.8,
        reviews: 17,
        isFeatured: false,
        inStock: true
      },
      {
        title: "BEGAE-182 English Communication Skills Solved Assignment 2024-25",
        code: "BEGAE-182",
        price: 45,
        oldPrice: 99,
        category: catBachelor._id,
        subCategory: subBAG._id,
        program: "BAG",
        semester: "1st Semester",
        year: "2024-25",
        session: "2024-25",
        productType: "assignment",
        description: "Top grade answers for all grammar, reading comprehension, writing skills, and dialogue writing exercises.",
        image: dummyImage,
        fileUrl: samplePdfUrl,
        questionPaperUrl: sampleQuestionUrl,
        questionPageUrl: sampleQuestionUrl,
        rating: 4.9,
        reviews: 62,
        isFeatured: true,
        inStock: true
      },
      {
        title: "MS-01 Management Functions and Behaviour Solved Assignment 2024-25",
        code: "MS-01",
        price: 65,
        oldPrice: 130,
        category: catMaster._id,
        subCategory: subMBA._id,
        program: "MBA",
        semester: "1st Semester",
        year: "2024-25",
        session: "2024-25",
        productType: "assignment",
        description: "In-depth case study solutions and management concepts explained thoroughly for IGNOU MBA students.",
        image: dummyImage,
        fileUrl: samplePdfUrl,
        questionPaperUrl: sampleQuestionUrl,
        questionPageUrl: sampleQuestionUrl,
        rating: 4.9,
        reviews: 29,
        isFeatured: true,
        inStock: true
      },
      {
        title: "MMPP-001 MBA Project Synopsis & Dissertation Report",
        code: "MMPP-001",
        price: 1299,
        oldPrice: 2499,
        category: catMaster._id,
        subCategory: subMBA._id,
        program: "MBA",
        semester: "4th Semester",
        year: "2024-25",
        session: "2024-25",
        productType: "project",
        description: "Customizable MBA project on Marketing / Finance / HR with questionnaire, statistical analysis, graphs, and approval assurance.",
        image: dummyImage,
        fileUrl: samplePdfUrl,
        questionPaperUrl: sampleQuestionUrl,
        questionPageUrl: sampleQuestionUrl,
        rating: 4.9,
        reviews: 38,
        isFeatured: true,
        inStock: true
      }
    ])

    console.log("Products created!")

    // 5. CREATE ORDERS (PDF, Handwritten, Dispatched, Cancelled/Refunded)
    console.log("Creating Sample Orders...")
    await Order.create([
      {
        user: student1._id,
        items: [
          {
            product: products[0]._id,
            code: products[0].code,
            title: products[0].title,
            price: products[0].price,
            quantity: 1,
            session: "2024-25",
            fileUrl: products[0].fileUrl
          },
          {
            product: products[1]._id,
            code: products[1].code,
            title: products[1].title,
            price: products[1].price,
            quantity: 1,
            session: "2024-25",
            fileUrl: products[1].fileUrl
          }
        ],
        deliveryType: "PDF",
        subtotal: 98,
        shippingFee: 0,
        discount: 10,
        grandTotal: 88,
        appliedPromo: "IGNOU10",
        paymentStatus: "Paid",
        orderStatus: "Completed",
        razorpayOrderId: "order_mock_94827101",
        razorpayPaymentId: "pay_mock_82710481",
        razorpaySignature: "mock_signature_valid_1"
      },
      {
        user: student2._id,
        items: [
          {
            product: products[3]._id,
            code: products[3].code,
            title: products[3].title,
            price: products[3].price,
            quantity: 1,
            session: "2024-25"
          }
        ],
        deliveryType: "Handwritten",
        shippingAddress: {
          name: "Priya Verma",
          phone: "9876543210",
          address: "Flat 402, Sunshine Heights, Sector 62, Noida, Uttar Pradesh - 201309",
          city: "Noida",
          district: "Gautam Buddha Nagar",
          state: "Uttar Pradesh",
          pincode: "201309"
        },
        subtotal: 249,
        shippingFee: 60,
        discount: 50,
        grandTotal: 259,
        appliedPromo: "WELCOME50",
        paymentStatus: "Paid",
        orderStatus: "Dispatched",
        trackingNumber: "SP8492019IN",
        courierName: "Speed Post India",
        previewImages: [
          "https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?auto=format&fit=crop&w=600&q=80"
        ],
        razorpayOrderId: "order_mock_11029482",
        razorpayPaymentId: "pay_mock_58291038",
        razorpaySignature: "mock_signature_valid_2"
      },
      {
        user: student3._id,
        items: [
          {
            product: products[10]._id,
            code: products[10].code,
            title: products[10].title,
            price: products[10].price,
            quantity: 1,
            session: "2024-25",
            fileUrl: products[10].fileUrl
          }
        ],
        deliveryType: "PDF",
        subtotal: 65,
        shippingFee: 0,
        discount: 0,
        grandTotal: 65,
        paymentStatus: "Paid",
        orderStatus: "Completed",
        razorpayOrderId: "order_mock_49201849",
        razorpayPaymentId: "pay_mock_93810294",
        razorpaySignature: "mock_signature_valid_3"
      },
      {
        user: student4._id,
        items: [
          {
            product: products[8]._id,
            code: products[8].code,
            title: products[8].title,
            price: products[8].price,
            quantity: 1,
            session: "2024-25"
          }
        ],
        deliveryType: "PDF",
        subtotal: 45,
        shippingFee: 0,
        discount: 0,
        grandTotal: 45,
        paymentStatus: "Pending",
        orderStatus: "Processing",
        razorpayOrderId: "order_mock_98271038"
      },
      {
        user: student1._id,
        items: [
          {
            product: products[4]._id,
            code: products[4].code,
            title: products[4].title,
            price: products[4].price,
            quantity: 1,
            session: "2024-25"
          }
        ],
        deliveryType: "Handwritten",
        shippingAddress: {
          name: "Rahul Sharma",
          phone: "9811223344",
          address: "House No 12, Janakpuri, West Delhi, Delhi - 110058",
          city: "New Delhi",
          district: "West Delhi",
          state: "Delhi",
          pincode: "110058"
        },
        subtotal: 999,
        shippingFee: 60,
        discount: 100,
        grandTotal: 959,
        appliedPromo: "FLAT100",
        paymentStatus: "Refunded",
        orderStatus: "Cancelled",
        refundId: "rfnd_mock_94820194",
        refundAmount: 959,
        cancellationReason: "Student requested cancellation due to wrong course code selection",
        razorpayOrderId: "order_mock_58291048",
        razorpayPaymentId: "pay_mock_48201948"
      }
    ])

    console.log("Orders created!")

    // 6. CREATE NOTICES & ANNOUNCEMENTS
    console.log("Creating IGNOU Notices & Announcements...")
    await Notice.create([
      {
        title: "IGNOU Term-End Examination (TEE) December 2024 Date Sheet Released",
        description: "The tentative date sheet for December 2024 Term End Examinations is now available. Students can check their respective course exam dates and slot timings.",
        link: "http://www.ignou.ac.in/",
        category: "exam",
        isImportant: true,
        isActive: true,
        publishDate: new Date()
      },
      {
        title: "Assignment Submission Deadline Extended for 2024-25 Session",
        description: "The competent authority has approved the extension of the last date for submission of assignments (both in hard copy and soft copy) up to 31st October 2024.",
        link: "http://www.ignou.ac.in/",
        category: "assignment",
        isImportant: true,
        isActive: true,
        publishDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        title: "Fresh Admissions and Re-Registration for January 2025 Session Commenced",
        description: "Portal for Online Re-registration and Fresh Admission for all ODL & Online programmes for January 2025 session is now active.",
        link: "https://ignouadmission.samarth.edu.in/",
        category: "admission",
        isImportant: false,
        isActive: true,
        publishDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        title: "IGNOU June 2024 TEE Result Updated with Grade Card Status",
        description: "Check the latest updated results and grade cards for June 2024 TEE on the official portal.",
        link: "http://www.ignou.ac.in/",
        category: "result",
        isImportant: false,
        isActive: true,
        publishDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      }
    ])

    console.log("Notices created!")

    // 7. CREATE STUDENT QUERIES / INQUIRIES
    console.log("Creating Student Queries...")
    await Query.create([
      {
        name: "Vikram Malhotra",
        email: "vikram.m@gmail.com",
        phone: "9811223344",
        type: "project",
        message: "Need guidance and customized synopsis for BCA final year BCSP-064 project on E-Commerce web app.",
        status: "In Progress",
        adminReply: "Our academic counselor has contacted you on WhatsApp with synopsis topics."
      },
      {
        name: "Anjali Saxena",
        email: "anjali.saxena@yahoo.com",
        phone: "9822334455",
        type: "assignment",
        message: "Looking for handwritten hardcopy assignments for MCA 1st semester. How many days will delivery take to Lucknow?",
        status: "Resolved",
        adminReply: "Speed post delivery takes 3-4 working days. You can place the order directly with Handwritten delivery option."
      },
      {
        name: "Karan Johar",
        email: "karan.j@gmail.com",
        phone: "9833445566",
        type: "admission",
        message: "When does the late fee start for January 2025 re-registration?",
        status: "Pending"
      },
      {
        name: "Suman Joshi",
        email: "suman.joshi@gmail.com",
        phone: "9844556677",
        type: "contact",
        message: "I paid for MCS-011 solved assignment PDF but couldn't download due to network glitch.",
        status: "Resolved",
        adminReply: "Verified your order. PDF link has been re-sent to your registered email."
      }
    ])

    console.log("Queries created!")

    // 8. CREATE COMMENTS / REVIEWS
    console.log("Creating Comments / Reviews...")
    await Comment.create([
      {
        product: products[0]._id,
        user: student1._id,
        role: "user",
        message: "Very well structured assignment! Got 92 marks in MCS-011. Thanks IGNOUPower team!"
      },
      {
        product: products[0]._id,
        user: admin._id,
        role: "admin",
        message: "Congratulations Rahul! Keep up the good work."
      },
      {
        product: products[3]._id,
        user: student2._id,
        role: "user",
        message: "The handwriting quality is superb and packaging was secure. Highly recommended for working students!"
      }
    ])

    console.log("Comments created!")

    console.log("\n========================================================")
    console.log("🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!")
    console.log("========================================================")
    console.log("👤 Admin Account: admin@ignoupower.shop | Password: Admin@123")
    console.log("👤 Demo Student: rahul.sharma@example.com | Password: User@123")
    console.log(`📦 Total Products Seeded: ${products.length}`)
    console.log("========================================================\n")

    process.exit(0)
  } catch (error) {
    console.error("❌ SEEDING ERROR:", error)
    process.exit(1)
  }
}

seedDatabase()
