const mongoose = require('mongoose')

const organizationSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['hostel', 'apartment', 'industry', 'community'],
    required: true
  },
  location: {
    type: String
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
},
{ timestamps: true }
)

module.exports = mongoose.model('Organization', organizationSchema)