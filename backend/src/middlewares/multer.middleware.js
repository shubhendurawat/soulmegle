import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/recordings"); // Change directory for better organization
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`); // Avoid duplicate filenames
  }
});

export const upload = multer({ storage: storage });
