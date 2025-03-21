const mongoose=require("mongoose")
const Banner=require("../../model/bannerSchema")



const loadBanner = async (req, res) => {
    try {
      const bannerData = await Banner.find().lean()
      console.log("From banner controller")
      console.log(bannerData)
      res.render('admin/banners', { bannerData, layout: 'adminLayout' })
    } catch (error) {
      console.log(error)
    }
  }
  
  const addBanner = (req, res) => {
    try {
  
      res.render('admin/add_banner', { layout: 'adminLayout' })
    } catch (error) {
      console.log(error);
    }
  }
  
  
  const addBannerPost = async (req, res) => {
    try {
      const { line1, line2, line3, line4 } = req.body
      const image = req.file.filename
  console.log(req.file)
      const banner = new Banner({
        line1: line1,
        line2: line2,
        line3: line3,
        line4: line4,
        image: image,
      })
  
      await banner.save()
      res.redirect('/admin/banners')
    } catch (error) {
      console.log(error)
    }
  }
  
  
  const editBanner = async (req, res) => {
    try {
      const id = req.params.id
      const bannerData = await Banner.findById({ _id: id }).lean()
  
      res.render("admin/editBanner", { bannerData, layout: 'adminLayout' })
  
    } catch (error) {
  
    }
  }

  const updateBannerPost = async (req, res) => {
    try {
      const { id } = req.params;
      const { line1, line2, line3, line4 } = req.body;
      let updatedData = { line1, line2, line3, line4 };
  
      
      if (req.file) {
        updatedData.image = req.file.filename;
      }

      const banner = await Banner.findByIdAndUpdate(id, updatedData, { new: true });
  
      if (!banner) {
        return res.status(404).send("Banner not found");
      }
  
      res.redirect('/admin/banners');
    } catch (error) {
      console.log(error);
      res.status(500).send("Internal Server Error");
    }
  };
  
  
  
  const deleteBanner = async (req, res) => {
    try {
      const id = req.query.id;
  
      await Banner.findByIdAndDelete(id);
  
      res.redirect("/admin/banners");
    } catch (error) {
      console.log(error);
      res.status(500).send("Internal Server Error")
    }
  };




  module.exports={
    loadBanner,addBanner,addBannerPost,editBanner,deleteBanner, updateBannerPost
  }
  