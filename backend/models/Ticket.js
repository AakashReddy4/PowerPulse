const mongoose = require('mongoose')

const ticketSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: [
      "OPEN",
      "ASSIGNED",
      "IN_PROGRESS",
      "RESOLVED_PENDING_CONFIRMATION",
      "CLOSED",
      "REOPENED"
    ],
    default: "OPEN"
  },
  
  resolvedAt: {
    type: Date
  },

  closedAt: {
    type: Date
  },

  confirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  isDeleted: {
  type: Boolean,
  default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  createdBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  slaHours: {
  type: Number,
  default: 24
  },
  deadline: {
    type: Date
  },
  history: [
  {
    action: {
      type: String
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: {
      type: String
    }
  }
],
  images: {
    type: [String],
    default: []
  },
  comments: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      role: {
        type: String,
        enum: ['resident', 'technician', 'admin']
      },
      message: {
        type: String,
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('Ticket', ticketSchema)