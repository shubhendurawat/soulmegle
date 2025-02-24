import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    return { accessToken, refreshToken }


  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating referesh and access token")
  }
}

const registerUser = asyncHandler(async (req, res) => {
  try {
    const { name, email, password } = req.body

    // validate input
    if ([name, email, password].some((field) => field?.trim() === "")) {
      throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({ email })

    if (existedUser) {
      throw new ApiError(400, "Username or email already exists")
    }
    const newUser = await User.create(
      {
        name,
        email,
        password
      }
    )

    const createdUser = await User.findById(newUser._id).select("-password -refreshToken");

    if (!createdUser) {
      throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res
      .status(201)
      .json(
        new ApiResponse(200, createdUser, "User registered Successfully")
      )
  } catch (error) {
    console.log(error);
  }

})

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    throw new ApiError(400, "Email and password is required")
  }

  const user = await User.findOne({ email })
  if (!user) {
    throw new ApiError(404, "User not found")
  }

  const isPasswordValid = await user.isPasswordCorrect(password)

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials")
  }

  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure: true
  };


  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken
        },
        "User logged in successfully"
      )
    );
    
})

const getUserProfile = asyncHandler(async (req, res) => {
  console.log("Fetching user profile for:", req.user._id); // Debugging
  const user = await User.findById(req.user._id).select("-password -refreshToken");

  if (!user) {
    console.error("User not found in database:", req.user._id); // Debugging
    throw new ApiError(404, "User not found");
  }

  console.log("User profile fetched:", user); // Debugging
  return res
    .status(200)
    .json(new ApiResponse(200, user, "User profile fetched successfully"));
});

export { registerUser, loginUser, getUserProfile };
