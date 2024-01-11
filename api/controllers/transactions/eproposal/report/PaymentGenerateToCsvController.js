const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const bcrypt = require('bcryptjs');
const moment = require("moment");
const randomToken = require('random-token');
const path = require('path');
const DBPROP = require("../../../../services/DBPROPOSAL");
const numeral = require('numeral');
const fs = require('fs');
const shell = require('shelljs');
const converter = require('json-2-csv');
const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, 'repo', param2, param3);

module.exports = {


  // GET ALL RESOURCE
  generate: async function (req, res) {
    req.setTimeout(2080000);
    const {
        query: {budget_year,doc_no,
          brand,activity,status_id,division_code,company_code
          }
      } = req;
      try {
        const request = await DBPROP.promise();
        let whereClause = ``;
  
  
      if(budget_year){
          whereClause += ` AND pr.budget_year = ${budget_year}`;
      }
  
  
      if(doc_no){
          whereClause += ` AND pr.doc_no = '${doc_no}'`;
      }
  
  
      if(division_code){
        whereClause += ` AND md.division_code = '${division_code}'`;
      }
  
      if(company_code){
          whereClause += ` AND mc.company_code = '${company_code}'`;
      }
  
      if(brand){
          whereClause += ` AND pr.brand_text LIKE '%${brand}%'`;
      }
      
      if(activity){
          whereClause += ` AND pa.activity_id = '${activity}'`;
      }
      
      if(status_id){
          whereClause += ` AND pr.status_id = '${status_id}'`;
      }
  
      
  
      let queryDataTable = `SELECT p.*, pr.referensi_no, pr.budget_year, pr.is_referensi, mc.company_desc, md.division_desc, 
      md.division_code, mc.company_code, mb.brand_desc, pr.brand_text, pr.doc_no as no_epro, pa.activity_id, pr.status_id
      FROM payment p LEFT JOIN m_company mc ON mc.company_id = p.company_id LEFT JOIN 
      m_division md ON md.division_code = p.division 
      LEFT JOIN proposal pr ON pr.doc_no = p.doc_no 
      LEFT JOIN proposal_budget pb ON pb.proposal_id = pr.proposal_id 
      LEFT JOIN m_brand mb ON mb.brand_code = pb.brand_code 
      LEFT JOIN proposal_activity pa ON pa.proposal_id = pr.proposal_id 
      WHERE 1=1 ${whereClause} GROUP BY p.bo_number `;
      console.log(queryDataTable);
        let [rows] = await request.query(queryDataTable);
        let arraydetailsforexcel = [];

        for (let i = 0; i < rows.length; i++) {
        
          let nomor = i+1;
          let obj = {

           
            "Nomor" : nomor,
            "Status" : rows[i].company_code ? rows[i].company_code : '', 
            "Vendor" : rows[i].branch_desc ? rows[i].branch_desc : '',
            "Company Code" : rows[i].brand_code ? rows[i].brand_code : '', 
            "Invoice No" : rows[i].doc_no ? rows[i].doc_no : '',
            "BO Number" : rows[i].proposal_date ? rows[i].proposal_date : '', 
            "BO Date" : rows[i].title ? rows[i].title : '', 
            "Year" : rows[i].budget_year ? rows[i].budget_year : '', 
            "No E-Propopsal" : numeral(rows[i].budget).format('0,0'), 
            "Brand" : rows[i].status_name ? rows[i].status_name : '',
            "Cry Code" : rows[i].activity_code ? rows[i].activity_code : '', 
            "Claim" : rows[i].activity_desc ? rows[i].activity_desc : '',
            "User" : rows[i].start_date ? rows[i].start_date : '', 
            "Text" : rows[i].end_date ? rows[i].end_date : '', 
  
          }
          arraydetailsforexcel.push(obj);

        }
        

        if(arraydetailsforexcel.length > 0){
          let tglfile = moment().format('DD-MMM-YYYY_HH_MM_SS');
          let namafile = 'payment_'.concat(tglfile).concat('.csv');         

          converter.json2csv(arraydetailsforexcel, (err, csv) => {
            if (err) {
                throw err;
            }
        
            // print CSV string
            
            let locationFiles = dokumentPath('temp','payment').replace(/\\/g, '/');
            shell.mkdir('-p', locationFiles);
            // write CSV to a file
            fs.writeFileSync(locationFiles+"/"+namafile, csv);
            let filecsv = path.join(locationFiles+'/'+`${namafile}`);
            res.setHeader('Content-Type', 'application/octet-stream'); //'application/vnd.openxmlformats'
            res.setHeader("Content-Disposition", "attachment; filename=" + namafile);
            return res.sendFile(filecsv);
            
        });
  
        }else{
  
          return res.error({
            message: "Data tidak ada"
          });
  
        }
      
    } catch (err) {
      return res.error(err);
    }
  },
 


}