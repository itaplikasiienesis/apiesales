
const moment = require("moment");
const DBPROP = require("../../../services/DBPROPOSAL");
const json2xls = require("json2xls");


module.exports = {

  exportExcel: async function(req, res) {
    const {m_user_id,budget_year} = req.query;
      await DB.poolConnect;
      try {
    
      const request = await DBPROP.promise();
      const request2 = DB.pool.request();


      let validation = [];
      let sqldatabudget = `SELECT * FROM vw_proposal_budget 
      WHERE budget_year='${budget_year}' AND reverse_amount > 0`;
      databudget = await request.query(sqldatabudget);
      budget = databudget[0]

      for (let i = 0; i < budget.length; i++) {
          
        let proposal_budget_id = budget[i].proposal_budget_id;
        let totalBudget = Number(budget[i].budget_awal);
        let reverseAmount = Number(budget[i].reverse_amount);
        let sqlGetSumTotalKlaim  = `SELECT COALESCE(SUM(kd.total_klaim),0) AS totalKlaim FROM klaim_detail kd,klaim k 
        WHERE kd.budget_id = '${proposal_budget_id}'
        AND k.klaim_id = kd.klaim_id
        AND k.kode_status <> 'RJF'`;
        
        let getSumTotalKlaim  = await request2.query(sqlGetSumTotalKlaim);
        let totalKlaim = getSumTotalKlaim.recordset.length > 0 ? getSumTotalKlaim.recordset[0].totalKlaim : 0 ;

        let outstandingReverse = totalBudget - totalKlaim - reverseAmount;

        console.log('totalBudget ',totalBudget);
        console.log('totalKlaim ',totalKlaim);
        console.log('reverseAmount ',reverseAmount);


        if(outstandingReverse < 0){

            console.log(' DATA TEREKAM ',proposal_budget_id);
            let nomor_proposal = budget[i].doc_no;
            let branch_code = budget[i].branch_code;
            let activity_code = budget[i].activity_id;
            let budget_year = budget[i].budget_year;
            let brand_code = budget[i].budget_year;

            let obj = {
                proposal_budget_id:proposal_budget_id,
                budget_year : budget_year,
                nomor_proposal : nomor_proposal,
                branch_code : branch_code,
                activity_code : activity_code,
                brand_code : brand_code,
                budget_awal : totalBudget,
                total_klaim : totalKlaim,
                reverse_amount : reverseAmount,
                outstanding_budget : outstandingReverse
            }
    

            validation.push(obj);
        }


        
      }


      if(validation.length > 0){



        let arraydetailsforexcel = [];
        for (let i = 0; i < validation.length; i++) {
          console.log("Lop >", validation[i].proposal_budget_id);
          let obj = {
            "PROPOSAL BUDGET ID": validation[i].proposal_budget_id.toString(),
            "BUDGET YEAR": validation[i].budget_year,
            "NOMOR PROPOSAL": validation[i].nomor_proposal,
            "BRANCH CODE": validation[i].branch_code,
            "BRAND CODE": validation[i].brand_code,
            "BUDGET AWAL": validation[i].budget_awal,
            "TOTAL KLAIM": validation[i].total_klaim,
            "TOTAL REVERSE": validation[i].reverse_amount,
            "BUDGET AKHIR": validation[i].outstanding_budget
          };

          arraydetailsforexcel.push(obj);
        }

        if (arraydetailsforexcel.length > 0) {
            let tglfile = moment().format("DD-MMM-YYYY_HH_MM_SS");
            let namafile = "reversal_minus".concat(tglfile).concat(".xlsx");
  
            var hasilXls = json2xls(arraydetailsforexcel);
            res.setHeader("Content-Type", "application/vnd.openxmlformats");
            res.setHeader(
              "Content-Disposition",
              "attachment; filename=" + namafile
            );
            res.end(hasilXls, "binary");
          }


      }else{
  
        return res.success({
            message: "Tarik data berhasil tetapi data kosong"
        });
      }

    } catch (err) {
        return res.error(err);
      }
  
    
  },

  deleteReverseAmount: async function(req, res){

    const {m_user_id,budget_year} = req.query;
      await DB.poolConnect;
      try {
    
      const request = await DBPROP.promise();
      const request2 = DB.pool.request();

      let sqldatabudget = `SELECT * FROM vw_control_logbook_2023 
      WHERE budget_year='${budget_year}' AND balance < 0`;

      console.log(sqldatabudget);

      let getDataLogbook = await request2.query(sqldatabudget);
      let budget = getDataLogbook.recordset;


      if(budget.length > 0){
        for (let i = 0; i < budget.length; i++) {
          
          console.log('Data ke ',i+1);
          let proposal_budget_id = budget[i].proposal_budget_id;
          let deleteReversal = `DELETE FROM proposal_reverse WHERE proposal_budget_id = '${proposal_budget_id}'`;
          await request.query(deleteReversal);
          console.log(deleteReversal);

          let updateMigrationData = `UPDATE proposal_budget SET ismigration='N' WHERE proposal_budget_id = '${proposal_budget_id}'`;
          await request.query(updateMigrationData);
          console.log(updateMigrationData);

        
        }
      }


      return res.success({
        message: "Delete data reversal minus berhasil"
      });

    } catch (err) {
        return res.error(err);
      }
  
    

  }

}
