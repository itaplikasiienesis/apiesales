
const moment = require("moment");

module.exports = {


  // GET ALL RESOURCE
  find: async function (req, res) {
    const {
      query: { currentPage, pageSize,year,open_budget_last_year,open_budget_next_year }
    } = req;

    try {
      

      let year = [];

      year.push({
        budget_year:2023
      });

      year.push({
        budget_year:2024
      })

      
      return res.success({
            result: year,
            message: "Fetch data successfully"
          });
      
    } catch (err) {
      return res.error(err);
    }
  },

  find2: async function (req, res) {
    const {
      query: { currentPage, pageSize,year,open_budget_last_year,open_budget_next_year }
    } = req;

    // await DBPROP;
    try {


      let year = [];
      
      year.push({
        budget_year:2023
      })

      year.push({
        budget_year:2024
      })

      console.log(year,"xxxxxxxxxxx");

      return res.success({
            result: year,
            message: "Fetch data successfully"
      });
      
    } catch (err) {
      return res.error(err);
    }
  },

  find3: async function (req, res) {
    const {
      query: { currentPage, pageSize,year,open_budget_last_year,open_budget_next_year }
    } = req;

    try {

      let year = [];

      year.push({
        budget_year:2023
      })

      year.push({
        budget_year:2024
      })

      return res.success({
            result: year,
            message: "Fetch data successfully"
      });
      
    } catch (err) {
      return res.error(err);
    }
  },

  findlogbook: async function (req, res) {

    try {


      let year = [];
      
      // year.push({
      //   budget_year:2020
      // });

      // year.push({
      //   budget_year:2021
      // });

      // year.push({
      //   budget_year:2022
      // });

      year.push({
        budget_year:2023
      });


      year.push({
        budget_year:2024
      })
      

      return res.success({
            result: year,
            message: "Fetch data successfully"
      });
      
    } catch (err) {
      return res.error(err);
    }
  }
}