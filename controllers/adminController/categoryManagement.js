const Category = require("../../model/categorySchema");
const fs = require("fs");
const path = require("path");
const Product = require("../../model/productSchema");
const HttpStatus = require('../../httpStatus');
const { log } = require("console");



// Load Category Page
const showCategoryPage = async (req, res) => {
  try {
    let page = 1;
    if (req.query.page) {
      page = req.query.page;
    }
    const limit = 5;
    const category = await Category.find({})
      .skip((page - 1) * limit)
      .limit(limit * 1)
      .lean();
    const count = await Category.find({}).countDocuments();
    const totalPages = Math.ceil(count / limit);
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    const catSaveMsg = req.session.catSave ? "Category added successfully..!!" : null;
  
    
    req.session.catSave = false;
    

    res.render("admin/show_category", {
      admin: true,
      pages,
      currentPage: page,
      category,
      catSaveMsg,
      layout: "adminLayout",
    });
  } catch (error) {
    console.log(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};


//Load Add Category Page
const addCategoryPage = (req, res) => {
  try {
      const catExistMsg = req.session.catExist ? "Category already exists..!!" : null;
      req.session.catExist = false;
      res.render("admin/add_category", {admin: true, catExistMsg, layout: "adminLayout" });
    } catch (error) {
    console.log(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};


// Add New Category
const addNewCategory = async (req, res) => {

  const catName = req.body.name;
  const image = req.file;

  try {
    const catExist = await Category.findOne({
      category: { $regex: new RegExp("^" + catName + "$", "i") },
    });
    if (!catExist) {
      const category = new Category({
        category: catName,
        imageUrl: image.filename,
      });

      await category.save();

      req.session.catSave = true;
      res.redirect("/admin/category");
    } else {
      req.session.catExist = true;
      res.redirect("/admin/addCategory");
    }
  } catch (error) {
    console.log(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};


// Unlist Category
const unListCategory = async (req, res) => {
  try {
    const { id } = req.body; 
    let category = await Category.findById(id);
      console.log(category)
    if (!category) {
      return res.status(404).send("Category not found");
    }

    let newListed = category.isListed; 

    
    await Category.findByIdAndUpdate(id, { $set: { isListed: !newListed } }, { new: true });

    console.log(`Category ${id} updated. New isListed value: ${newListed}`);

    
    const updateResult = await Product.updateMany(
      { category: category._id },  
      { $set: { isBlocked: newListed } } 
    );

    console.log(`Products updated: ${updateResult.modifiedCount}`);

    res.redirect("/admin/category");
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send("Internal Server Error");
  }
};


const showEditCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const category = await Category.findById(categoryId).lean()
    res.render("admin/editCategory", { layout: "adminLayout", category });
  } catch (error) {
    console.log(error.message);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};


// Update Category
const updateCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const newCategoryName = req.body.name;
    const image = req.file;
    const category = await Category.findById(categoryId).lean()

    let updImage;

    if (image) {
      updImage = image.filename;
      console.log("Uploaded image:", updImage);
    } else {
      updImage = category.imageUrl;
    }

    const categoryExist = await Category.findOne({
      category: { $regex: new RegExp(`^${newCategoryName}$`, "i") },
      _id: { $ne: categoryId },
    });

    if (categoryExist) {
      req.session.catExist = true;
      return res.redirect(`/admin/editCategory/${categoryId}`);
    }

    await Category.findByIdAndUpdate(
      categoryId,
      {
        category: newCategoryName,
        imageUrl: updImage,
      },
      { new: true }
    );

    req.session.categoryUpdate = true;
    res.redirect("/admin/category");
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(HttpStatus.InternalServerError).send("Internal Server Error");
  }
};


module.exports = {
  addCategoryPage,
  addNewCategory,
  showCategoryPage,
  unListCategory,
  showEditCategory,
  updateCategory
  
};
