const Organization = require('../models/Organization')
const User = require('../models/User')

const createOrganization = async (req, res) => {
  try {

    //Create organization
    const organization = await Organization.create({
      name: req.body.name,
      type: req.body.type,
      location: req.body.location
    })

    const existingUser = await User.findById(req.user._id)

    if (existingUser.organization) {
      return res.status(400).json({
        message: "User already belongs to an organization"
      })
    }

    //Update current user, make ADMIN + link org
    const user = await User.findById(req.user._id)

    user.organization = organization._id
    user.role = "admin"

    await user.save()

    //set admin field in organization
    organization.admin = user._id
    await organization.save()

    res.status(201).json({
      message: "Organization created successfully",
      organization
    })

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { createOrganization }