const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const bcrypt = require('bcryptjs');
const moment = require("moment");
const numeral = require("numeral");
const randomToken = require('random-token');
const json2xls = require('json2xls');
const DBPROP = require("../../../services/DBPROPOSAL");
module.exports = {


  // GET ALL RESOURCE

  find: async function (req, res) {
    const {
      query: { currentPage, pageSize,budgetYear,quarter,periode,group,searchText }
    } = req;


    await DB.poolConnect;
    // await DBPROP;
    try {
      const request = await DBPROP.promise();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      let whereClause = ``;
      let whereYear = ``;
      let whereQuarter = ``;
      let wherePeriode = ``;
      let whereGroup = ``;


        if (searchText) {
        whereClause = `AND b.id_budget LIKE '%${searchText}%'
        OR b.year LIKE '%${searchText}%' OR b.quarter LIKE '%${searchText}%'
        OR mg.group_name LIKE '%${searchText}%'
        OR b.brand_code LIKE '%${searchText}%'
        OR mb.brand_desc LIKE '%${searchText}%'
        OR b.budget LIKE '%${searchText}%'
        OR b.keterangan LIKE '%${searchText}%'
        `;
      }


      if(budgetYear){
        whereYear = `AND b.year = '${budgetYear}'`;
      }


      if(quarter){
        whereQuarter = `AND b.quarter = '${quarter}'`;
      }

      if(periode){
        wherePeriode = `AND b.bulan = '${periode}'`;
      }


      if(group){
        whereGroup = `AND b.group_id = '${group}'`;
      }



      let queryCountTable = `SELECT COUNT(1) AS total_rows
      FROM budget b
      LEFT JOIN m_group mg ON b.group_id = mg.id_group
      LEFT JOIN m_brand mb ON b.brand_code = mb.brand_code WHERE 1 = 1
      ${whereClause} ${whereYear} ${whereQuarter} ${wherePeriode} ${whereGroup}`;

      let queryDataTable = `SELECT b.id_budget AS id,b.year,b.quarter,mg.group_name,b.brand_code,mb.brand_desc,b.budget,b.keterangan,b.bulan,
      CASE WHEN b.bulan=1 THEN 'Januari' 
      WHEN b.bulan=2 THEN 'Februari'
      WHEN b.bulan=3 THEN 'Maret'
      WHEN b.bulan=4 THEN 'April'
      WHEN b.bulan=5 THEN 'Mei'
      WHEN b.bulan=6 THEN 'Juni'
      WHEN b.bulan=7 THEN 'Juli'
      WHEN b.bulan=8 THEN 'Agustus'
      WHEN b.bulan=9 THEN 'September'
      WHEN b.bulan=10 THEN 'Oktober'
      WHEN b.bulan=11 THEN 'November'
      WHEN b.bulan=12 THEN 'Desember' END AS nama_bulan,
      b.activity_code,
      mc.activity_desc
      FROM budget b
      LEFT JOIN m_group mg ON b.group_id = mg.id_group
      LEFT JOIN m_activity mc ON b.activity_code = mc.activity_code AND b.year = mc.year
      LEFT JOIN m_brand mb ON b.brand_code = mb.brand_code 
      WHERE 1 = 1 ${whereClause} ${whereYear} ${whereQuarter} ${wherePeriode} ${whereGroup} ORDER BY b.created_date DESC limit ${offset},${limit}`;

      // console.log(queryDataTable);
      let result = await request.query(queryCountTable);
      const count = result[0][0].total_rows;
      let [rows, fields] = await request.query(queryDataTable);
      for (let i = 0; i < rows.length; i++) {

        rows[i].no = i+1;
        rows[i].budget = Number(rows[i].budget);

          
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

  find2: async function (req, res) {
    const {
      query: { currentPage, pageSize,year,searchText }
    } = req;


    await DB.poolConnect;
    // await DBPROP;
    try {
      const request2 = DB.pool.request();
      const request = await DBPROP.promise();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      let whereClause = ``;
        if (searchText) {
        whereClause = `AND b.id_budget LIKE '%${searchText}%'
        OR b.year LIKE '%${searchText}%' OR b.quarter LIKE '%${searchText}%'
        OR mg.group_name LIKE '%${searchText}%'
        OR b.brand_code LIKE '%${searchText}%'
        OR mb.brand_desc LIKE '%${searchText}%'
        OR b.budget LIKE '%${searchText}%'
        OR b.keterangan LIKE '%${searchText}%'
        `;
      }

      //console.log('year ',year);

      let queryCountTable = `SELECT COUNT(1) AS total_rows
      FROM budget b
      LEFT JOIN m_group mg ON b.group_id = mg.id_group
      LEFT JOIN m_brand mb ON b.brand_code = mb.brand_code WHERE 1 = 1
      ${whereClause}`;

      let queryDataTable = `SELECT b.id_budget AS id,b.year,b.quarter,mg.group_name,b.brand_code,mb.brand_desc,b.budget,b.keterangan,b.bulan,
      CASE WHEN b.bulan=1 THEN 'Januari' 
      WHEN b.bulan=2 THEN 'Februari'
      WHEN b.bulan=3 THEN 'Maret'
      WHEN b.bulan=4 THEN 'April'
      WHEN b.bulan=5 THEN 'Mei'
      WHEN b.bulan=6 THEN 'Juni'
      WHEN b.bulan=7 THEN 'Juli'
      WHEN b.bulan=8 THEN 'Agustus'
      WHEN b.bulan=9 THEN 'September'
      WHEN b.bulan=10 THEN 'Oktober'
      WHEN b.bulan=11 THEN 'November'
      WHEN b.bulan=12 THEN 'Desember' END AS nama_bulan
      ,kode_shipto
      FROM budget b
      LEFT JOIN m_group mg ON b.group_id = mg.id_group
      LEFT JOIN m_brand mb ON b.brand_code = mb.brand_code WHERE 1 = 1 ${whereClause} ORDER BY id_budget DESC limit ${offset},${limit}`;

      let result = await request.query(queryCountTable);
      const count = result[0][0].total_rows;
      let [rows, fields] = await request.query(queryDataTable);
      for (let i = 0; i < rows.length; i++) {

        rows[i].no = i+1;
        rows[i].budget = Number(rows[i].budget);
        let kode_shipto = rows[i].kode_shipto;
        let sqlgetdistributor = `SELECT * FROM m_distributor_v WHERE kode='${kode_shipto}'`;
        let datadistributor = await request2.query(sqlgetdistributor);
        let distributor = datadistributor.recordset;
        rows[i].nama_shipto = distributor[0].nama;
          
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

      let queryDataTable = `SELECT b.id_budget AS id,b.year,b.quarter,mg.group_name,b.brand_code,mb.brand_desc,b.budget,b.keterangan,b.bulan,
      CASE WHEN b.bulan=1 THEN 'Januari' 
      WHEN b.bulan=2 THEN 'Februari'
      WHEN b.bulan=3 THEN 'Maret'
      WHEN b.bulan=4 THEN 'April'
      WHEN b.bulan=5 THEN 'Mei'
      WHEN b.bulan=6 THEN 'Juni'
      WHEN b.bulan=7 THEN 'Juli'
      WHEN b.bulan=8 THEN 'Agustus'
      WHEN b.bulan=9 THEN 'September'
      WHEN b.bulan=10 THEN 'Oktober'
      WHEN b.bulan=11 THEN 'November'
      WHEN b.bulan=12 THEN 'Desember' END AS nama_bulan
      FROM budget b
      LEFT JOIN m_group mg ON b.group_id = mg.id_group
      LEFT JOIN m_brand mb ON b.brand_code = mb.brand_code WHERE b.id_budget='${req.param(
        "id"
      )}'`;

      let [rows, fields] = await request.query(queryDataTable);
      const row = rows[0];

      return res.success({
        result: rows,
        message: "Fetch data successfully"
      });

    } catch (err) {
      return res.error(err);
    }
  },

  create: async function (req, res) {
    const {
      group_id, brand_code, budget, active, created_by, keterangan,budget_year,bulan,kode,activity_id
    } = req.body;
    console.log(req.body);
    // await DBPROP;
    try {
      const request = await DBPROP.promise();
      let varBulan = bulan ? bulan : 'NULL';      
      let paramquarter = 'Q1';
    
      if(varBulan >= 1 && varBulan < 4){
        paramquarter = 'Q1';
      }else if(varBulan >= 4 && varBulan < 7){
        paramquarter = 'Q2';
      }else if(varBulan >= 7 && varBulan < 10){
        paramquarter = 'Q3';
      }else if(varBulan >= 10 && varBulan <= 12){
        paramquarter = 'Q4';
      }else{
        paramquarter = 'NULL';
      }

    
      let InsertqueryDataTable = `INSERT INTO budget
      (group_id, brand_code, quarter, budget, 
      year, active, created_by, created_date, 
      updated_by, updated_date, keterangan,bulan,kode_shipto,activity_code)
      VALUES(${group_id}, '${brand_code}','${paramquarter}', ${budget}, ${budget_year}, 
      ${active}, '${created_by}', now(), '${created_by}',now(),'${keterangan}',${varBulan},NULL,'${activity_id}')`;
      await request.query(InsertqueryDataTable);


    
      return res.success({
        message: "Create data successfully"
      });


    } catch (err) {
      return res.error(err);
    }
  },

  create2: async function (req, res) {
    const {
      group_id, brand_code, budget, active, created_by, keterangan,budget_year,bulan
    } = req.body;
    //console.log(req.body);
    // await DBPROP;
    try {
      const request = await DBPROP.promise();
      let varBulan = bulan ? bulan : 'NULL';      
      let paramquarter = 'Q1';
    
      if(varBulan >= 1 && varBulan < 4){
        paramquarter = 'Q1';
      }else if(varBulan >= 4 && varBulan < 7){
        paramquarter = 'Q2';
      }else if(varBulan >= 7 && varBulan < 10){
        paramquarter = 'Q3';
      }else if(varBulan >= 10 && varBulan <= 12){
        paramquarter = 'Q4';
      }else{
        paramquarter = 'NULL';
      }

      //let budget_year = moment().format('YYYY');
      let InsertqueryDataTable = `INSERT INTO budget
      (group_id, brand_code, quarter, budget, 
      year, active, created_by, created_date, 
      updated_by, updated_date, keterangan,bulan)
      VALUES(${group_id}, '${brand_code}','${paramquarter}', ${budget}, ${budget_year}, 
      ${active}, '${created_by}', now(), '${created_by}',now(),'${keterangan}',${varBulan})`;
      await request.query(InsertqueryDataTable);

      return res.success({
            message: "Create data successfully"
          });
      
    } catch (err) {
      return res.error(err);
    }
  },
  movebudget: async function (req, res) {
    const {
      group_id_from, brand_code_from,group_id_to, brand_code_to, budget, active, 
      created_by, keterangan,budget_year,from_period,to_period,activity_id_to,
      activity_id_from
    } = req.body;

    // await DBPROP;

    console.log(req.body);

    try {
      const request = await DBPROP.promise();
      //let budget_year = moment().format('YYYY');


      console.log(req.body);


      if(budget <= 0){
        return res.error({
          message: "Budget tidak boleh minus atau 0"
        });
      }else{


        let BudgetFrom = budget * (-1);
        let varBulanFrom = from_period ? from_period : 'NULL';
        let varBulanTo = to_period ? to_period : 'NULL';



        let from_paramquarter = 'Q1';
    
        if(varBulanFrom >= 1 && varBulanFrom < 4){
          from_paramquarter = 'Q1';
        }else if(varBulanFrom >= 4 && varBulanFrom < 7){
          from_paramquarter = 'Q2';
        }else if(varBulanFrom >= 7 && varBulanFrom < 10){
          from_paramquarter = 'Q3';
        }else if(varBulanFrom >= 10 && varBulanFrom <= 12){
          from_paramquarter = 'Q4';
        }else{
          from_paramquarter = 'NULL';
        }

        let to_paramquarter = 'Q1';
    
        if(varBulanTo >= 1 && varBulanTo < 4){
          to_paramquarter = 'Q1';
        }else if(varBulanTo >= 4 && varBulanTo < 7){
          to_paramquarter = 'Q2';
        }else if(varBulanTo >= 7 && varBulanTo < 10){
          to_paramquarter = 'Q3';
        }else if(varBulanTo >= 10 && varBulanTo <= 12){
          to_paramquarter = 'Q4';
        }else{
          to_paramquarter = 'NULL';
        }




          // PROSES PENGECEK BUDGET FROM
  

        let sqlGetBundgetFrom = `SELECT COALESCE(SUM(budget),0) AS budget FROM budget WHERE group_id = ${group_id_from} 
          AND brand_code ='${brand_code_from}' 
          AND bulan=${varBulanFrom} AND year = ${budget_year} AND activity_code='${activity_id_from}'`;


          console.log(sqlGetBundgetFrom);


        let [rows] = await request.query(sqlGetBundgetFrom);
        let row = rows[0];
        let budgetFromCheck = row.budget;


        // PROSES PENGECEKAN BUDGET YANG DIGUNAKAN
        let sqlCekBudgetDigunakan = `SELECT
        COALESCE(sum(pb.budget),0) budget
        FROM
            ((proposal p
        join proposal_budget pb)
        left join m_activity mact on
            (mact.activity_code = pb.activity_id
                and mact.year = p.budget_year))
        WHERE
        p.status_id <> 99
        and p.proposal_id = pb.proposal_id
        and pb.bulan is NOT null
        and p.budget_year = ${budget_year}
        and pb.bulan = ${varBulanFrom}
        and mact.group_id = ${group_id_from}
        AND pb.brand_code = '${brand_code_from}'
        AND pb.activity_id = '${activity_id_from}'`;

        console.log(sqlCekBudgetDigunakan);


        let getdatabudgetdigunakan = await request.query(sqlCekBudgetDigunakan);
        let budgetTerpakai = getdatabudgetdigunakan[0][0].budget;


        let sqlCekReversal = ` SELECT COALESCE(SUM(pr.reverse_amount),0) AS reverse_amount FROM proposal_budget pb,proposal_reverse pr,proposal p 
        WHERE pb.proposal_budget_id = pr.proposal_budget_id
        AND pb.brand_code = '${brand_code_from}'
        AND pb.activity_id = '${activity_id_from}'
        AND p.proposal_id = pb.proposal_id
        AND pb.bulan is not null
        AND p.status_id <> 99
        AND p.budget_year = ${budget_year}
        AND pb.bulan = ${varBulanFrom}`;

        console.log(sqlCekReversal);


        let getdataReversal = await request.query(sqlCekReversal);
        let reversalAmount = getdataReversal[0][0].reverse_amount;

        let totalBudgetTerpakai = (Number(budgetTerpakai) - Number(reversalAmount));

      
        console.log('budgetFromCheck ',budgetFromCheck);
        console.log('BudgetFrom ',budget);
        console.log('budgetTerpakai ',budgetTerpakai);
        console.log('reversalAmount ',reversalAmount);
        console.log('total Budget penggunaan ',totalBudgetTerpakai);


        let sisaBudget = (Number(budgetFromCheck) - totalBudgetTerpakai - Number(budget));
        let budgetTersedia = numeral(Number(budgetFromCheck) - totalBudgetTerpakai).format('0,0');
        
        if(sisaBudget >= 0){

          let activity_code_from_text = activity_id_from ? `'${activity_id_from}'` : 'NULL';
          let activity_code_to_text = activity_id_to ? `'${activity_id_to}'` : 'NULL';


          let InsertqueryDataTableFrom = `INSERT INTO budget
          (group_id, brand_code, quarter, budget, year, active, created_by, created_date, updated_by, updated_date, keterangan,bulan,activity_code)
          VALUES(${group_id_from}, '${brand_code_from}','${from_paramquarter}', ${BudgetFrom}, ${budget_year}, ${active}, 
          '${created_by}', now(), '${created_by}',now(), '${keterangan}',${varBulanFrom},${activity_code_from_text})`;
          //console.log(InsertqueryDataTableFrom);
          await request.query(InsertqueryDataTableFrom);
  
  
          let InsertqueryDataTableTo = `INSERT INTO budget
          (group_id, brand_code, quarter, budget, year, active, created_by, created_date, updated_by, updated_date, keterangan,bulan,activity_code)
          VALUES(${group_id_to}, '${brand_code_to}','${to_paramquarter}', ${budget}, ${budget_year}, ${active}, '${created_by}', 
          now(), '${created_by}',now(), '${keterangan}',${varBulanTo},${activity_code_to_text})`;
          //console.log(InsertqueryDataTableTo);
          await request.query(InsertqueryDataTableTo);
  
          return res.success({
            message: "Create data successfully"
          });
        
        }else{

          return res.error({
            message: `Budget Awal tidak cukup untuk dipindahkan, budget awal yang tersedia adalah adalah ${budgetTersedia}`
          });

        }
                   
      }
      
    } catch (err) {
      return res.error(err);
    }
  },


  movebudget2: async function (req, res) {
    const {
      group_id_from, brand_code_from,group_id_to, brand_code_to, quarter, budget, active, created_by, keterangan,budget_year,from_period,to_period,
      from_shipto,to_shipto
    } = req.body;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();
      //let budget_year = moment().format('YYYY');


      if(budget <= 0){
        return res.error({
          message: "Budget tidak boleh minus atau 0"
        });
      }else{


        let BudgetFrom = budget * (-1);
        let varBulanFrom = from_period ? from_period : 'NULL';
        let varBulanTo = to_period ? to_period : 'NULL';



        let from_paramquarter = 'Q1';
    
        if(varBulanFrom >= 1 && varBulanFrom < 4){
          from_paramquarter = 'Q1';
        }else if(varBulanFrom >= 4 && varBulanFrom < 7){
          from_paramquarter = 'Q2';
        }else if(varBulanFrom >= 7 && varBulanFrom < 10){
          from_paramquarter = 'Q3';
        }else if(varBulanFrom >= 10 && varBulanFrom <= 12){
          from_paramquarter = 'Q4';
        }else{
          from_paramquarter = 'NULL';
        }

        let to_paramquarter = 'Q1';
    
        if(varBulanTo >= 1 && varBulanTo < 4){
          to_paramquarter = 'Q1';
        }else if(varBulanTo >= 4 && varBulanTo < 7){
          to_paramquarter = 'Q2';
        }else if(varBulanTo >= 7 && varBulanTo < 10){
          to_paramquarter = 'Q3';
        }else if(varBulanTo >= 10 && varBulanTo <= 12){
          to_paramquarter = 'Q4';
        }else{
          to_paramquarter = 'NULL';
        }
  


        let InsertqueryDataTableFrom = `INSERT INTO budget
        (group_id, brand_code, quarter, budget, year, active, created_by, created_date, updated_by, updated_date, keterangan,bulan,kode_shipto)
        VALUES(${group_id_from}, '${brand_code_from}','${from_paramquarter}', ${BudgetFrom}, ${budget_year}, ${active}, '${created_by}', now(), '${created_by}',now(), '${keterangan}',${varBulanFrom},'${from_shipto}')`;
        console.log(InsertqueryDataTableFrom);
        await request.query(InsertqueryDataTableFrom);


        let InsertqueryDataTableTo = `INSERT INTO budget
        (group_id, brand_code, quarter, budget, year, active, created_by, created_date, updated_by, updated_date, keterangan,bulan,kode_shipto)
        VALUES(${group_id_to}, '${brand_code_to}','${to_paramquarter}', ${budget}, ${budget_year}, ${active}, '${created_by}', now(), '${created_by}',now(), '${keterangan}',${varBulanTo},'${to_shipto}')`;
        console.log(InsertqueryDataTableTo);
        await request.query(InsertqueryDataTableTo);

        return res.success({
          message: "Create data successfully"
        });
      
      }
      
    } catch (err) {
      return res.error(err);
    }
  },

  exportExcel: async function(req, res) {
    const {
      query: { budgetYear,quarter,periode,group,searchText }
    } = req;
    await DB.poolConnect;
    
    try {
      const request = await DBPROP.promise();
      let whereClause = ``;
      let whereYear = ``;
      let whereQuarter = ``;
      let wherePeriode = ``;
      let whereGroup = ``;

      
      if(budgetYear){
        whereYear = `AND b.year = '${budgetYear}'`;
      }


      if(quarter){
        whereQuarter = `AND b.quarter = '${quarter}'`;
      }

      if(periode){
        wherePeriode = `AND b.bulan = '${periode}'`;
      }


      if(group){
        whereGroup = `AND b.group_id = '${group}'`;
      }

      if (searchText) {
        whereClause = `AND b.id_budget LIKE '%${searchText}%'
        OR b.year LIKE '%${searchText}%' OR b.quarter LIKE '%${searchText}%'
        OR mg.group_name LIKE '%${searchText}%'
        OR b.brand_code LIKE '%${searchText}%'
        OR mb.brand_desc LIKE '%${searchText}%'
        OR b.budget LIKE '%${searchText}%'
        OR b.keterangan LIKE '%${searchText}%'
        `;
      }

      let queryDataTable = `SELECT b.id_budget AS id,b.year,b.quarter,b.group_id,mg.group_name,
      b.brand_code,mb.brand_desc,b.budget,b.keterangan,ma.activity_code,ma.activity_desc,b.bulan
      FROM budget b
      LEFT JOIN m_group mg ON b.group_id = mg.id_group
      LEFT JOIN m_brand mb ON b.brand_code = mb.brand_code 
      LEFT JOIN m_activity ma  ON b.activity_code = ma.activity_code AND ma.year = b.year 
      WHERE 1=1 ${whereClause} ${whereYear} ${whereQuarter} ${wherePeriode} ${whereGroup}
      ORDER BY id_budget DESC`;

      // console.log(queryDataTable);

      let [rows] = await request.query(queryDataTable);
      let arraydetailsforexcel = [];
      for (let i = 0; i < rows.length; i++) {
        let no = i+1;

        let obj = {
  
          "No": no, 
          "ID": rows[i].id, 
          "Year": rows[i].year,  
          "Period": rows[i].bulan,       
          "Quarter" : rows[i].quarter,
          "Group Code" : rows[i].group_id,
          "Group" : rows[i].group_name, 
          "Brand" : rows[i].brand_desc,
          "Budget" : rows[i].budget,
          "Keterangan" : rows[i].keterangan, 
          "Keterangan" : rows[i].keterangan, 
          "Activity Code" : rows[i].activity_code,
          "Activity" : rows[i].activity_desc
  
        }

        arraydetailsforexcel.push(obj);

          
      }

  
      if(arraydetailsforexcel.length > 0){
        let tglfile = moment().format('DD-MMM-YYYY_HH_MM_SS');
        let namafile = 'E-Proposal_Budgeting_'.concat(tglfile).concat('.xlsx');          
        
        var hasilXls = json2xls(arraydetailsforexcel);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats');
        res.setHeader("Content-Disposition", "attachment; filename=" + namafile);
        res.end(hasilXls, 'binary');
      }else{

        return res.error({
          message: "Data tidak ada"
        });

      }

    } catch (err) {
        return res.error(err);
    }
  }

}