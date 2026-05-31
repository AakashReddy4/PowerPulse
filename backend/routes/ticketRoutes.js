const express = require("express")
const router = express.Router()
const { protect, authorize } = require("../middlewares/authMiddleware")
const upload = require("../middlewares/uploadMiddleware")

const {
  createTicket,
  getAllTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
  assignTicket,
  addComment,
  getComments,
  resolveTicket,
  confirmTicketResolution,
  reopenTicket,
  getOrganizationTickets
} = require("../controllers/ticketController")

// CREATE
router.post("/", protect, upload.array("images", 5), createTicket)

// GET ALL
router.get("/", protect, getAllTickets)

//ORG TICKETS
router.get(
  "/organization",
  protect,
  getOrganizationTickets
)

// GET ONE
router.get("/:id", protect, getTicketById)

// UPDATE
router.put("/:id", protect, updateTicket)

// DELETE
router.delete("/:id", protect, authorize("admin"), deleteTicket)

// ASSIGN TECHNICIAN
router.put("/:id/assign", protect, authorize("admin"), assignTicket)

// ADD COMMENT
router.post("/:id/comment", protect, addComment)

// GET COMMENTS
router.get("/:id/comments", protect, getComments)

// RESOLVE
router.patch(
  "/:id/resolve",
  protect,
  authorize("technician"),
  upload.array("images", 5),
  resolveTicket
)

// CONFIRM BY RESIDENT
router.patch("/:id/confirm", protect, confirmTicketResolution)

// REOPEN
router.patch("/:id/reopen", protect, reopenTicket)



module.exports = router