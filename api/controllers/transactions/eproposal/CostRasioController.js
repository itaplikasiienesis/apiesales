const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require('uuid/v4');
const moment = require('moment');
const DBPROP = require("../../../services/DBPROPOSAL"); 
const _ = require('lodash');
const fs = require("fs");
const path = require('path');
const glob = require("glob");
const md5 = require('md5');
const numeral = require('numeral');

const strtotime = require('locutus/php/datetime/strtotime'); 
const mt_rand = require('locutus/php/math/mt_rand'); 
const { log } = require("locutus/php/math");
const SendEmailApproval = require('../../../services/SendEmailApproval');

const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, 'repo', param2, param3);
module.exports = {
  // GET ALL RESOURCE
  find: async function (req, res) {
    const {
      query: { currentPage, pageSize,employee_id,searchText}
    } = req;

    // await DBPROP;ar
    try {
      const request = await DBPROP.promise();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      let whereClause = ``;
      
      if (searchText) {
        whereClause = `AND ms.status_name LIKE '%${searchText}%'
        OR p.total_budget LIKE '%${searchText}%' OR p.proposal_date LIKE '%${searchText}%'
        OR p.brand_text LIKE '%${searchText}%'  OR p.doc_no LIKE '%${searchText}%'
        OR p.budget_year LIKE '%${searchText}%' OR p.title LIKE '%${searchText}%'`;
      }

      let queryCountTable = ``;
      let queryDataTable =  ``;
      
      // console.log(employee_id);
      if(employee_id){


        let sqlgetEmployee = `SELECT * FROM employee WHERE employee_id = '${employee_id}'`;
        let dataemployee = await request.query(sqlgetEmployee);
        let employeelst = dataemployee[0];
        let employee = employeelst.length > 0 ? employeelst[0].name : null;

        if(employeelst.length > 0){

          queryDataTable = `SELECT p.proposal_id,ms.status_name AS status,p.total_budget AS budget,
          DATE_FORMAT(p.proposal_date, "%Y-%m-%d") AS documentdate,
          p.brand_text AS brand,p.doc_no AS documentno,p.budget_year AS period,p.title AS name,p.status_id,
          p.start_date,p.end_date  FROM proposal_budget pb
          LEFT JOIN m_activity ma  ON pb.activity_id = ma.activity_code
          ,proposal_payment_complate ppc,proposal p
          LEFT JOIN m_status ms ON p.status_id = ms.status_id  
          WHERE 1=1 AND p.status_id=30 AND ppc.proposal_budget_id = pb.proposal_budget_id
          AND pb.proposal_id = p.proposal_id
          AND ma.year = p.budget_year
          AND ma.iscostrasio = 'Y'
          AND pb.cost_rasio = 0 AND p.created_by='${employee}' ${whereClause}
          ORDER BY p.created_date DESC  limit ${offset},${limit}`;



          queryCountTable = `SELECT COUNT(1) AS total_rows FROM proposal_budget pb
          LEFT JOIN m_activity ma  ON pb.activity_id = ma.activity_code
          ,proposal_payment_complate ppc,proposal p
          WHERE 1=1 AND p.status_id=30 AND ppc.proposal_budget_id = pb.proposal_budget_id
          AND pb.proposal_id = p.proposal_id AND p.created_by='${employee}'
          AND ma.year = p.budget_year
          AND ma.iscostrasio = 'Y'
          AND pb.cost_rasio = 0 ${whereClause}`;
                            
                            
        }else{
          
          queryDataTable = `SELECT p.proposal_id,ms.status_name AS status,p.total_budget AS budget,
          DATE_FORMAT(p.proposal_date, "%Y-%m-%d") AS documentdate,
          p.brand_text AS brand,p.doc_no AS documentno,p.budget_year AS period,p.title AS name,p.status_id,
          p.start_date,p.end_date  FROM proposal_budget pb
          LEFT JOIN m_activity ma  ON pb.activity_id = ma.activity_code
          ,proposal_payment_complate ppc,proposal p
          LEFT JOIN m_status ms ON p.status_id = ms.status_id  
          WHERE 1=1 AND p.status_id=30 AND ppc.proposal_budget_id = pb.proposal_budget_id
          AND pb.proposal_id = p.proposal_id 
          AND ma.year = p.budget_year
          AND ma.iscostrasio = 'Y'
          AND pb.cost_rasio = 0 ${whereClause}
          ORDER BY p.created_date DESC limit ${offset},${limit}`;
          

          queryCountTable = `SELECT COUNT(1) AS total_rows FROM proposal_budget pb
          LEFT JOIN m_activity ma  ON pb.activity_id = ma.activity_code
          ,proposal_payment_complate ppc,proposal p
          WHERE 1=1 AND p.status_id=30 AND ppc.proposal_budget_id = pb.proposal_budget_id
          AND pb.proposal_id = p.proposal_id
          AND ma.year = p.budget_year
          AND ma.iscostrasio = 'Y'
          AND pb.cost_rasio = 0 ${whereClause}`;


        }



      }else{

        queryDataTable = `SELECT p.proposal_id,ms.status_name AS status,p.total_budget AS budget,
        DATE_FORMAT(p.proposal_date, "%Y-%m-%d") AS documentdate,
        p.brand_text AS brand,p.doc_no AS documentno,p.budget_year AS period,p.title AS name,p.status_id,
        p.start_date,p.end_date  FROM proposal_budget pb
        LEFT JOIN m_activity ma  ON pb.activity_id = ma.activity_code
        ,proposal_payment_complate ppc,proposal p
        LEFT JOIN m_status ms ON p.status_id = ms.status_id  
        WHERE 1=1 AND p.status_id=30 AND ppc.proposal_budget_id = pb.proposal_budget_id
        AND pb.proposal_id = p.proposal_id 
        AND ma.year = p.budget_year
        AND ma.iscostrasio = 'Y'
        AND pb.cost_rasio = 0 ${whereClause}
        ORDER BY p.created_date DESC limit ${offset},${limit}`;

        queryCountTable = `SELECT COUNT(1) AS total_rows FROM proposal_budget pb
        LEFT JOIN m_activity ma  ON pb.activity_id = ma.activity_code
        ,proposal_payment_complate ppc,proposal p
        WHERE 1=1 AND p.status_id=30 AND ppc.proposal_budget_id = pb.proposal_budget_id
        AND pb.proposal_id = p.proposal_id
        AND ma.year = p.budget_year
        AND ma.iscostrasio = 'Y'
        AND pb.cost_rasio = 0 ${whereClause}`;

      }                      


       console.log(queryDataTable);
      // console.log(queryCountTable);
      let result = await request.query(queryCountTable);
      const count = result[0][0].total_rows;
      let [rows, fields] = await request.query(queryDataTable);

      
      
      for (let i = 0; i < rows.length; i++) {
        
        rows[i].no = i+1;
      
      }
      
      const meta = paginate(currentPage, count, rows, pageSize);
      

      return res.success({
            result: rows,
            meta,
            message: "Fetch data successfully"
          });
      
    } catch (err) {
      return res.error(err);
    }
  },

  findOne: async function(req, res) {
    await DB.poolConnect;
    try {
      const request = await DBPROP.promise();
      const {
        query: {m_user_id,employee_id }
      } = req;

      let queryDataTable = `SELECT
      p.status_id,
      p.user_id,
      p.proposal_id,
      p.doc_no AS proposal_no,ms.status_name AS status,
      p.budget_year,p.title,p.proposal_date,
      DATE_FORMAT(p.start_date, '%Y-%m-%d') AS period_start,
      DATE_FORMAT(p.end_date, '%Y-%m-%d') AS period_end,
      p.division_code AS division,
      p.region_id,
      p.month_proposal,
      p.division_code,
      p.company_code,
      mdv.division_id,
      mc.company_id,
      mr.region_desc AS region,
      p.total_budget,
      p.total_budget AS budget,
      p.sales_target,
      p.avg_sales AS avarage_sales,
      p.mechanism,
      p.kpi,
      p.objective,
      p.background,
      DATE_FORMAT(p.start_date, '%Y-%m-%d') AS start_date,
      DATE_FORMAT(p.end_date, '%Y-%m-%d') AS end_date,
      p.avg_sales,
      p.sales_target,
      p.created_by     
      FROM proposal p
      LEFT JOIN m_status ms ON p.status_id = ms.status_id
      LEFT JOIN m_region mr ON mr.region_id = p.region_id
      LEFT JOIN m_company mc ON mc.company_code = p.company_code
      LEFT JOIN m_division mdv ON mdv.division_code = p.division_code and p.company_code = mdv.company_desc
      WHERE p.proposal_id = '${req.param(
        "id"
      )}'`;

      //console.log(queryDataTable);    
      let [rows, fields] = await request.query(queryDataTable);
    
      let row = rows[0];
      let tahun = row.budget_year;
      //console.log(tahun);

      let company_id = row.company_id;
      //console.log(company_id);
      let division_code = row.division_code;
      row.mechanism = row.mechanism.replace('*\r','');

      let sqlgetexecutor = `SELECT * FROM proposal_executor LEFT JOIN employee ON proposal_executor.employee_id = employee.id WHERE proposal_id = '${req.param(
        "id"
      )}'`;

      let dataexecutor = await request.query(sqlgetexecutor);
      let executor = dataexecutor[0];


      let sqlgetdistributor = `SELECT *,nama_distributor AS name FROM proposal_distributor LEFT JOIN distributor ON proposal_distributor.distributor_id = distributor.distributor_id WHERE proposal_id = '${req.param(
        "id"
      )}'`;

      let datadistributor = await request.query(sqlgetdistributor);
      let distributor = datadistributor[0];

      let sqlgetemaildistributor = `SELECT * FROM proposal_email_distributor WHERE proposal_id = '${req.param(
        "id"
      )}'`;

      let dataemaildistributor = await request.query(sqlgetemaildistributor);
      let emaildistributor = dataemaildistributor[0];
      
      let emaildist = emaildistributor.map(function (item) {
          return item['email_distributor'];
      });
            
      let sqlgetmarkettype= `SELECT pm.proposal_market_id,mmt.* FROM proposal_market pm 
      LEFT JOIN m_market_type mmt ON(pm.market_type_id = mmt.market_type_code)
      WHERE pm.proposal_id = '${req.param(
        "id"
      )}'`;

      let datamarketype = await request.query(sqlgetmarkettype);
      let markettype = datamarketype[0];



      let sqlgetapprovalprogress = `SELECT DISTINCT * FROM v_appr_history WHERE proposal_id = '${req.param(
        "id"
      )}' ORDER BY no_appr ASC`;
      let dataapprovalprogress = await request.query(sqlgetapprovalprogress);
      let approvalprogress = dataapprovalprogress[0];

      let budget_year = tahun;
      let active = 0;
      let companyfilter = ``;
      if(budget_year==2020){
        active = 0;
        companyfilter = `AND activity.company_id=${company_id}`
      }else{
        active = 1;
      }

      let sqlgetbudget = `SELECT 
      pb.proposal_budget_id,
      pb.proposal_budget_id AS budget_id,
      activity.division,
      mbch.branch_code,
      mbch.branch_desc AS branch,
      activity.activity_desc AS activity,
      pb.budget,
      activity.activity_code,
      mb.brand_code,
      mb.brand_code AS brand,
      pb.nilai_so,
      pb.cost_rasio,
      activity.ispercentage,
      pb.bulan
      FROM proposal_budget pb
      LEFT JOIN m_activity activity ON activity.activity_code = pb.activity_id  AND activity.year = '${budget_year}'
      LEFT JOIN m_branch mbch ON mbch.branch_code = pb.branch_code 
      LEFT JOIN m_brand mb ON mb.brand_code = pb.brand_code
      LEFT JOIN proposal p ON p.proposal_id = pb.proposal_id 
      WHERE pb.proposal_id = '${req.param(
        "id"
      )}'
      AND activity.active = ${active}
      AND pb.cost_rasio = 0
      AND activity.iscostrasio = 'Y'
      ${companyfilter}
      `;

      //GROUP BY pb.activity_id, pb.brand_code, pb.branch_code
      //console.log(sqlgetbudget);

      let databudget = await request.query(sqlgetbudget);
      let budget = databudget[0];

      let datavariant = [];
      let periode = [];
      let ispercentage = 'N';
      for (let i = 0; i < budget.length; i++) {
        budget[i].division = division_code;
        budget[i].division_code = division_code;

        let budgetactivity = 0;
        let budgetperactivity = 0;

        let budget_act = budgetactivity - budgetperactivity;
        let budgetbrand = 0;
        let budgetperbrand = 0;

        let budget_brand = budgetbrand - budgetperbrand;

        budget[i].budgetactivity = budget_act;
        budget[i].budgetbrand = budget_brand;
        budget[i].budgettoapprove = budget[i].budget;
        let bulan_periode = convertBulan(budget[i].bulan);
        let bulan =  budget[i].bulan;
        budget[i].bulan = bulan_periode;
        periode.push(bulan); 

        let proposal_budget_id = budget[i].proposal_budget_id;
        let sqlproposalbudgetvariant = `SELECT pbv.proposal_budget_variant_id,pbv.proposal_budget_id,pbv.proposal_id,
        pbv.variant_id,mv.variant_desc,mv.package_type,mv.brand_code
        FROM proposal_budget_variant pbv 
        LEFT JOIN m_variant mv ON(pbv.variant_id = mv.variant_id)
        WHERE pbv.proposal_budget_id = '${proposal_budget_id}'`;
        //console.log(sqlproposalbudgetvariant);

        let dataproposalbudgetvariant = await request.query(sqlproposalbudgetvariant);
        let proposalbudgetvariant = dataproposalbudgetvariant[0];
        datavariant.push(proposalbudgetvariant[0])
        budget[i].variant = proposalbudgetvariant;

        if(budget[i].ispercentage=='Y'){
            ispercentage = 'Y'
        }


        delete budget[i].budget;

      }

      row.ispercentage = ispercentage;

      let sqlgetsku = `SELECT pbv.proposal_budget_variant_id,pbv.proposal_budget_id,pbv.proposal_id,
      pbv.variant_id,mv.variant_desc,mv.package_type,mv.brand_code
      FROM proposal_budget_variant pbv
      LEFT JOIN m_variant mv ON(pbv.variant_id = mv.variant_id)
      WHERE pbv.proposal_id = '${req.param(
        "id"
      )}'`;


      
      let datasku= await request.query(sqlgetsku);
      let sku = datasku[0];
       
    //   let sku = _.uniqBy(datavariant,"variant_id");

      let sqlgethistory = `SELECT * FROM v_history WHERE proposal_id = '${req.param(
        "id"
      )}' ORDER BY created_date DESC`;

      let datahistory = await request.query(sqlgethistory);
      let history = datahistory[0];

      let sqlgetfile = `SELECT proposal_file_id AS uid,file AS name,'done' AS status FROM proposal_file WHERE proposal_id = '${req.param(
        "id"
      )}'`;

      
      let sqlgetStatusApprovalByEmployeeId = `SELECT status_approval_id,proposal_approval_id FROM proposal_approval WHERE proposal_id = '${req.param(
        "id"
      )}' AND employee_id = '${employee_id}'`;
      
      let status_approval_id = undefined;
      let proposal_approval_id = undefined;
      if(employee_id){

        let dataapprovalemployee = await request.query(sqlgetStatusApprovalByEmployeeId);
        let approvalemployee = dataapprovalemployee[0];
        status_approval_id = approvalemployee.length > 0 ? approvalemployee[0].status_approval_id : 0;
        proposal_approval_id = approvalemployee.length > 0 ? approvalemployee[0].proposal_approval_id : null;
      }

      
      row.status_approval_id = status_approval_id;
      row.proposal_approval_id = proposal_approval_id;
      let datafile = await request.query(sqlgetfile);
      let file = datafile[0];


        for (let i = 0; i < distributor.length; i++) {
          
          let no = i + 1;
          distributor[i].no = no;
          
        }

        for (let i = 0; i < budget.length; i++) {
          
          let no = i + 1;
          budget[i].no = no;
          
        }

        for (let i = 0; i < history.length; i++) {
          
          let no = i + 1;
          history[i].no = no;
          
        }

        for (let i = 0; i < approvalprogress.length; i++) {
          
          let no = i + 1;
          approvalprogress[i].no = no;

          if(approvalprogress[i].flag == 0){
            approvalprogress[i].status = "Menunggu";
          }else if(approvalprogress[i].flag == 1){
            approvalprogress[i].status = "Sedang Diproses";
          }else{
            approvalprogress[i].status = "Selesai";
          }

          
        }

        let arraysku = [];
        for (let i = 0; i < sku.length; i++) {
          
          let no = i + 1;
          sku[i].no = no;
          let brand_code = sku[i].brand_code;
          let package_type = sku[i].package_type;
          let datasku = brand_code +' '+package_type;
          arraysku.push(datasku)
          
        }



        for (let i = 0; i < sku.length; i++) {
          
          let no = i + 1;
          sku[i].no = no;
 
          
        }


        for (let i = 0; i < file.length; i++) {

          let proposal_id = file[i].proposal_id;
          let no = i + 1;
          file[i].no = no;
          file[i].url = "";
          
        }        
        arraysku = [...new Set(arraysku)];
        emaildist = [...new Set(emaildist)];
        row.sku = arraysku.toString();
        row.variant = sku;
        row.executor = executor;
        row.distributor = distributor;
        row.emaildistributor = emaildist.toString();
        row.approvalprogress = approvalprogress;
        row.budget = budget;
        row.history = history;
        row.file = file;
        row.markettype = markettype;


        let periode_desc = [];
        for (let i = 0; i < periode.length; i++) {
          let bulan = periode[i];
          let bulan_desc = convertBulan(bulan);
          periode_desc.push(bulan_desc);
        }
        row.periode = periode;
        row.periode_desc =_.uniq(periode_desc).toString();

        //console.log(row);

      return res.success({
        result: row,
        message: "Fetch data successfully"
      });


    } catch (err) {
      return res.error(err);
    }
  },
  findHistory: async function (req, res) {
    const {
      query: { currentPage, pageSize,employee_id,searchText}
    } = req;

    // await DBPROP;ar
    try {
      const request = await DBPROP.promise();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      let whereClause = ``;
      
      if (searchText) {
        whereClause = `AND ms.status_name LIKE '%${searchText}%'
        OR p.total_budget LIKE '%${searchText}%' OR p.proposal_date LIKE '%${searchText}%'
        OR p.brand_text LIKE '%${searchText}%'  OR p.doc_no LIKE '%${searchText}%'
        OR p.budget_year LIKE '%${searchText}%' OR p.title LIKE '%${searchText}%'`;
      }

      let queryCountTable = ``;
      let queryDataTable =  ``;
      
      // console.log(employee_id);
      if(employee_id){


        let sqlgetEmployee = `SELECT * FROM employee WHERE employee_id = '${employee_id}'`;
        let dataemployee = await request.query(sqlgetEmployee);
        let employeelst = dataemployee[0];
        let employee = employeelst.length > 0 ? employeelst[0].name : null;

        if(employeelst.length > 0){

          queryDataTable = `SELECT p.proposal_id,ms.status_name AS status,p.total_budget AS budget,
          DATE_FORMAT(p.proposal_date, "%Y-%m-%d") AS documentdate,
          p.brand_text AS brand,p.doc_no AS documentno,p.budget_year AS period,p.title AS name,p.status_id,
          p.start_date,p.end_date  FROM proposal_budget pb,proposal_payment_complate ppc,proposal p
          LEFT JOIN m_status ms ON p.status_id = ms.status_id  
          WHERE 1=1 AND p.status_id=30 AND ppc.proposal_budget_id = pb.proposal_budget_id
          AND pb.proposal_id = p.proposal_id 
          AND pb.cost_rasio > 0 AND p.created_by='${employee}' ${whereClause}
          ORDER BY p.created_date DESC  limit ${offset},${limit}`;



          queryCountTable = `SELECT COUNT(1) AS total_rows FROM proposal_budget pb,proposal_payment_complate ppc,proposal p
          WHERE 1=1 AND p.status_id=30 AND ppc.proposal_budget_id = pb.proposal_budget_id
          AND pb.proposal_id = p.proposal_id AND created_by='${employee}'
          AND pb.cost_rasio > 0 ${whereClause}`;
                            
                            
        }else{
          
          queryDataTable = `SELECT p.proposal_id,ms.status_name AS status,p.total_budget AS budget,
          DATE_FORMAT(p.proposal_date, "%Y-%m-%d") AS documentdate,
          p.brand_text AS brand,p.doc_no AS documentno,p.budget_year AS period,p.title AS name,p.status_id,
          p.start_date,p.end_date  FROM proposal_budget pb,proposal_payment_complate ppc,proposal p
          LEFT JOIN m_status ms ON p.status_id = ms.status_id  
          WHERE 1=1 AND p.status_id=30 AND ppc.proposal_budget_id = pb.proposal_budget_id
          AND pb.proposal_id = p.proposal_id 
          AND pb.cost_rasio > 0 ${whereClause}
          ORDER BY p.created_date DESC limit ${offset},${limit}`;
          

          queryCountTable = `SELECT COUNT(1) AS total_rows FROM proposal_budget pb,proposal_payment_complate ppc,proposal p
          WHERE 1=1 AND p.status_id=30 AND ppc.proposal_budget_id = pb.proposal_budget_id
          AND pb.proposal_id = p.proposal_id
          AND pb.cost_rasio > 0 ${whereClause}`;


        }



      }else{

        queryDataTable = `SELECT p.proposal_id,ms.status_name AS status,p.total_budget AS budget,
        DATE_FORMAT(p.proposal_date, "%Y-%m-%d") AS documentdate,
        p.brand_text AS brand,p.doc_no AS documentno,p.budget_year AS period,p.title AS name,p.status_id,
        p.start_date,p.end_date  FROM proposal_budget pb,proposal_payment_complate ppc,proposal p
        LEFT JOIN m_status ms ON p.status_id = ms.status_id  
        WHERE 1=1 AND p.status_id=30 AND ppc.proposal_budget_id = pb.proposal_budget_id
        AND pb.proposal_id = p.proposal_id 
        AND pb.cost_rasio > 0 ${whereClause}
        ORDER BY p.created_date DESC limit ${offset},${limit}`;

        queryCountTable = `SELECT COUNT(1) AS total_rows FROM proposal_budget pb,proposal_payment_complate ppc,proposal p
        WHERE 1=1 AND p.status_id=30 AND ppc.proposal_budget_id = pb.proposal_budget_id
        AND pb.proposal_id = p.proposal_id
        AND pb.cost_rasio > 0 ${whereClause}`;

      }                      


       //console.log(queryDataTable);
      // console.log(queryCountTable);
      let result = await request.query(queryCountTable);
      const count = result[0][0].total_rows;
      let [rows, fields] = await request.query(queryDataTable);


      for (let i = 0; i < rows.length; i++) {
        
        rows[i].no = i+1;
      
      }

      const meta = paginate(currentPage, count, rows, pageSize);

      return res.success({
            result: rows,
            meta,
            message: "Fetch data successfully"
          });
      
    } catch (err) {
      return res.error(err);
    }
  },

  findOneHistory: async function(req, res) {
    await DB.poolConnect;
    try {
      const request = await DBPROP.promise();
      const {
        query: {m_user_id,employee_id }
      } = req;

      let queryDataTable = `SELECT
      p.status_id,
      p.user_id,
      p.proposal_id,
      p.doc_no AS proposal_no,ms.status_name AS status,
      p.budget_year,p.title,p.proposal_date,
      DATE_FORMAT(p.start_date, '%Y-%m-%d') AS period_start,
      DATE_FORMAT(p.end_date, '%Y-%m-%d') AS period_end,
      p.division_code AS division,
      p.region_id,
      p.month_proposal,
      p.division_code,
      p.company_code,
      mdv.division_id,
      mc.company_id,
      mr.region_desc AS region,
      p.total_budget,
      p.total_budget AS budget,
      p.sales_target,
      p.avg_sales AS avarage_sales,
      p.mechanism,
      p.kpi,
      p.objective,
      p.background,
      DATE_FORMAT(p.start_date, '%Y-%m-%d') AS start_date,
      DATE_FORMAT(p.end_date, '%Y-%m-%d') AS end_date,
      p.avg_sales,
      p.sales_target,
      p.created_by     
      FROM proposal p
      LEFT JOIN m_status ms ON p.status_id = ms.status_id
      LEFT JOIN m_region mr ON mr.region_id = p.region_id
      LEFT JOIN m_company mc ON mc.company_code = p.company_code
      LEFT JOIN m_division mdv ON mdv.division_code = p.division_code and p.company_code = mdv.company_desc
      WHERE p.proposal_id = '${req.param(
        "id"
      )}'`;

      //console.log(queryDataTable);    
      let [rows, fields] = await request.query(queryDataTable);
    
      let row = rows[0];
      let tahun = row.budget_year;
      //console.log(tahun);

      let company_id = row.company_id;
      //console.log(company_id);
      let division_code = row.division_code;
      row.mechanism = row.mechanism.replace('*\r','');

      let sqlgetexecutor = `SELECT * FROM proposal_executor LEFT JOIN employee ON proposal_executor.employee_id = employee.id WHERE proposal_id = '${req.param(
        "id"
      )}'`;

      let dataexecutor = await request.query(sqlgetexecutor);
      let executor = dataexecutor[0];


      let sqlgetdistributor = `SELECT *,nama_distributor AS name FROM proposal_distributor LEFT JOIN distributor ON proposal_distributor.distributor_id = distributor.distributor_id WHERE proposal_id = '${req.param(
        "id"
      )}'`;

      let datadistributor = await request.query(sqlgetdistributor);
      let distributor = datadistributor[0];

      let sqlgetemaildistributor = `SELECT * FROM proposal_email_distributor WHERE proposal_id = '${req.param(
        "id"
      )}'`;

      let dataemaildistributor = await request.query(sqlgetemaildistributor);
      let emaildistributor = dataemaildistributor[0];
      
      let emaildist = emaildistributor.map(function (item) {
          return item['email_distributor'];
      });
            
      let sqlgetmarkettype= `SELECT pm.proposal_market_id,mmt.* FROM proposal_market pm 
      LEFT JOIN m_market_type mmt ON(pm.market_type_id = mmt.market_type_code)
      WHERE pm.proposal_id = '${req.param(
        "id"
      )}'`;

      let datamarketype = await request.query(sqlgetmarkettype);
      let markettype = datamarketype[0];



      let sqlgetapprovalprogress = `SELECT DISTINCT * FROM v_appr_history WHERE proposal_id = '${req.param(
        "id"
      )}' ORDER BY no_appr ASC`;
      let dataapprovalprogress = await request.query(sqlgetapprovalprogress);
      let approvalprogress = dataapprovalprogress[0];

      let budget_year = tahun;
      let active = 0;
      let companyfilter = ``;
      if(budget_year==2020){
        active = 0;
        companyfilter = `AND activity.company_id=${company_id}`
      }else{
        active = 1;
      }

      let sqlgetbudget = `SELECT 
      pb.proposal_budget_id,
      pb.proposal_budget_id AS budget_id,
      activity.division,
      mbch.branch_code,
      mbch.branch_desc AS branch,
      activity.activity_desc AS activity,
      pb.budget,
      activity.activity_code,
      mb.brand_code,
      mb.brand_code AS brand,
      pb.nilai_so,
      pb.cost_rasio,
      pb.bulan
      FROM proposal_budget pb
      LEFT JOIN m_activity activity ON activity.activity_code = pb.activity_id  AND activity.year = '${budget_year}'
      LEFT JOIN m_branch mbch ON mbch.branch_code = pb.branch_code 
      LEFT JOIN m_brand mb ON mb.brand_code = pb.brand_code
      LEFT JOIN proposal p ON p.proposal_id = pb.proposal_id 
      WHERE pb.proposal_id = '${req.param(
        "id"
      )}'
      AND activity.active = ${active}
      AND pb.cost_rasio > 0
      AND activity.iscostrasio = 'Y'
      ${companyfilter}
      `;

      //GROUP BY pb.activity_id, pb.brand_code, pb.branch_code
      console.log(sqlgetbudget);

      let databudget = await request.query(sqlgetbudget);
      let budget = databudget[0];

      let datavariant = [];
      let periode = [];
      let ispercentage = 'N';
      for (let i = 0; i < budget.length; i++) {
        budget[i].division = division_code;
        budget[i].division_code = division_code;

        let budgetactivity = 0;
        let budgetperactivity = 0;

        let budget_act = budgetactivity - budgetperactivity;
        let budgetbrand = 0;
        let budgetperbrand = 0;

        let budget_brand = budgetbrand - budgetperbrand;

        budget[i].budgetactivity = budget_act;
        budget[i].budgetbrand = budget_brand;
        budget[i].budgettoapprove = budget[i].budget;


        let bulan_periode = convertBulan(budget[i].bulan);
        let bulan =  budget[i].bulan;
        budget[i].bulan = bulan_periode;
        periode.push(bulan); 

        let proposal_budget_id = budget[i].proposal_budget_id;
        let sqlproposalbudgetvariant = `SELECT pbv.proposal_budget_variant_id,pbv.proposal_budget_id,pbv.proposal_id,
        pbv.variant_id,mv.variant_desc,mv.package_type,mv.brand_code
        FROM proposal_budget_variant pbv 
        LEFT JOIN m_variant mv ON(pbv.variant_id = mv.variant_id)
        WHERE pbv.proposal_budget_id = '${proposal_budget_id}'`;
        //console.log(sqlproposalbudgetvariant);

        let dataproposalbudgetvariant = await request.query(sqlproposalbudgetvariant);
        let proposalbudgetvariant = dataproposalbudgetvariant[0];
        datavariant.push(proposalbudgetvariant[0])
        budget[i].variant = proposalbudgetvariant;

        if(budget[i].ispercentage=='Y'){
            ispercentage = 'Y'
        }


        delete budget[i].budget;

      }
      row.ispercentage = ispercentage;

      let sqlgetsku = `SELECT pbv.proposal_budget_variant_id,pbv.proposal_budget_id,pbv.proposal_id,
      pbv.variant_id,mv.variant_desc,mv.package_type,mv.brand_code
      FROM proposal_budget_variant pbv
      LEFT JOIN m_variant mv ON(pbv.variant_id = mv.variant_id)
      WHERE pbv.proposal_id = '${req.param(
        "id"
      )}'`;

      

      
      let datasku= await request.query(sqlgetsku);
      let sku = datasku[0];
       
    //   let sku = _.uniqBy(datavariant,"variant_id");

      let sqlgethistory = `SELECT * FROM v_history WHERE proposal_id = '${req.param(
        "id"
      )}' ORDER BY created_date DESC`;

      let datahistory = await request.query(sqlgethistory);
      let history = datahistory[0];

      let sqlgetfile = `SELECT proposal_file_id AS uid,file AS name,'done' AS status FROM proposal_file WHERE proposal_id = '${req.param(
        "id"
      )}'`;

      
      let sqlgetStatusApprovalByEmployeeId = `SELECT status_approval_id,proposal_approval_id FROM proposal_approval WHERE proposal_id = '${req.param(
        "id"
      )}' AND employee_id = '${employee_id}'`;
      
      let status_approval_id = undefined;
      let proposal_approval_id = undefined;
      if(employee_id){

        let dataapprovalemployee = await request.query(sqlgetStatusApprovalByEmployeeId);
        let approvalemployee = dataapprovalemployee[0];
        status_approval_id = approvalemployee.length > 0 ? approvalemployee[0].status_approval_id : 0;
        proposal_approval_id = approvalemployee.length > 0 ? approvalemployee[0].proposal_approval_id : null;
      }


      row.status_approval_id = status_approval_id;
      row.proposal_approval_id = proposal_approval_id;
      let datafile = await request.query(sqlgetfile);
      let file = datafile[0];


        for (let i = 0; i < distributor.length; i++) {
          
          let no = i + 1;
          distributor[i].no = no;
          
        }

        for (let i = 0; i < budget.length; i++) {
          
          let no = i + 1;
          budget[i].no = no;
          
        }

        for (let i = 0; i < history.length; i++) {
          
          let no = i + 1;
          history[i].no = no;
          
        }

        for (let i = 0; i < approvalprogress.length; i++) {
          
          let no = i + 1;
          approvalprogress[i].no = no;

          if(approvalprogress[i].flag == 0){
            approvalprogress[i].status = "Menunggu";
          }else if(approvalprogress[i].flag == 1){
            approvalprogress[i].status = "Sedang Diproses";
          }else{
            approvalprogress[i].status = "Selesai";
          }

          
        }

        let arraysku = [];
        for (let i = 0; i < sku.length; i++) {
          
          let no = i + 1;
          sku[i].no = no;
          let brand_code = sku[i].brand_code;
          let package_type = sku[i].package_type;
          let datasku = brand_code +' '+package_type;
          arraysku.push(datasku)
          
        }



        for (let i = 0; i < sku.length; i++) {
          
          let no = i + 1;
          sku[i].no = no;
 
          
        }


        for (let i = 0; i < file.length; i++) {

          let proposal_id = file[i].proposal_id;
          let no = i + 1;
          file[i].no = no;
          file[i].url = "";
          
        }        
        arraysku = [...new Set(arraysku)];
        emaildist = [...new Set(emaildist)];
        row.sku = arraysku.toString();
        row.variant = sku;
        row.executor = executor;
        row.distributor = distributor;
        row.emaildistributor = emaildist.toString();
        row.approvalprogress = approvalprogress;
        row.budget = budget;
        row.history = history;
        row.file = file;
        row.markettype = markettype;


        let periode_desc = [];
        for (let i = 0; i < periode.length; i++) {
          let bulan = periode[i];
          let bulan_desc = convertBulan(bulan);
          periode_desc.push(bulan_desc);
        }
        row.periode = periode;
        row.periode_desc =_.uniq(periode_desc).toString();

        //console.log(row);

      return res.success({
        result: row,
        message: "Fetch data successfully"
      });


    } catch (err) {
      return res.error(err);
    }
  },
  prosesCostRasio: async function (req, res) {

    const request = await DBPROP.promise();
    const {
      data
    } = req.body;

        try {

            let validation = [];
            
            if(data){

                if(data.length > 0){
                    for (let i = 0; i < data.length; i++) {
                        let cost_rasio = data[i].cost_rasio;
                        let baris = i +1;
                        
                        if(cost_rasio == 0){
                            validation.push(`Cost Rasio tidak boleh 0 cek baris ke ${baris}`);
                        }
                    }
                }else{
                    validation.push(`Parameter tidak valid`);
                }
                
            }else{
                validation.push(`Parameter tidak valid`);
            }
            

            if(validation.length > 0){
                return res.error({
                    message: validation.toString()
                });
            }else{


                for (let i = 0; i < data.length; i++) {
                    let proposal_budget_id = data[i].proposal_budget_id;
                    let cost_rasio = data[i].cost_rasio;
                   
                    let sqlUpdateDataCostRasio = `UPDATE proposal_budget SET cost_rasio=${cost_rasio} WHERE proposal_budget_id='${proposal_budget_id}'`;
                    await request.query(sqlUpdateDataCostRasio);
                }

                return res.success({
                    message: "Proses data successfully"
                });
            }

    
        } catch (err) {
            return res.error(err);
        }

}

}




function convertBulan(bulan){

  let periode =  ``;
  if(bulan==1){
    periode='Januari';
  }else if(bulan==2){
    periode='Februari';
  }else if(bulan==3){
    periode='Maret';
  }else if(bulan==4){
    periode='April';
  }else if(bulan==5){
    periode='Mei';
  }else if(bulan==6){
    periode='Juni';
  }else if(bulan==7){
    periode='Juli';
  }else if(bulan==8){
    periode='Agustus';
  }else if(bulan==9){
    periode='September';
  }else if(bulan==10){
    periode='Oktober';
  }else if(bulan==11){
    periode='November';
  }else if(bulan==12){
    periode='Desember';
  }

  return periode;

}

function deConvertBulan(bulan){

  let periode =  1;
  if(bulan.toUpperCase()=='JANUARI'){
    periode=1;
  }else if(bulan.toUpperCase()=='FEBRUARI'){
    periode=2;
  }else if(bulan.toUpperCase()=='MARET'){
    periode=3;
  }else if(bulan.toUpperCase()=='APRIL'){
    periode=4;
  }else if(bulan.toUpperCase()=='MEI'){
    periode=5;
  }else if(bulan.toUpperCase()=='JUNI'){
    periode=6;
  }else if(bulan.toUpperCase()=='JULI'){
    periode=7;
  }else if(bulan.toUpperCase()=='AGUSTUS'){
    periode=8;
  }else if(bulan.toUpperCase()=='SEPTEMBER'){
    periode=9;
  }else if(bulan.toUpperCase()=='OKTOBER'){
    periode=10;
  }else if(bulan.toUpperCase()=='NOVEMBER'){
    periode=11;
  }else if(bulan.toUpperCase()=='DESEMBER'){
    periode=12;
  }

  return periode;

}