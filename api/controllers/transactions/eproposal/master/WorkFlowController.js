const { calculateLimitAndOffset, paginate } = require("paginate-info");
const uuid = require("uuid/v4");
const bcrypt = require('bcryptjs');
const moment = require("moment");
const randomToken = require('random-token');
const DBPROP = require("../../../../services/DBPROPOSAL");
module.exports = {



  find: async function (req, res) {
    const {
      query: { currentPage, pageSize,searchText }
    } = req;

    try {
      const request = await DBPROP.promise();
      const { limit, offset } = calculateLimitAndOffset(currentPage, pageSize);
      let whereClause = ``;
      if (searchText) {
        whereClause = `AND workflow_name LIKE '%${searchText}%'
        OR division LIKE '%${searchText}%'
        `;
      }

      let queryCountTable = `SELECT COUNT(1) AS total_rows
                            FROM workflow WHERE active=1 ${whereClause}`;

      let queryDataTable = `SELECT * FROM workflow WHERE active=1 ${whereClause} ORDER BY workflow_id DESC limit ${offset},${limit}`;

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

      let queryDataTable = `SELECT * FROM workflow WHERE workflow_id ='${req.param(
        "id"
      )}'`;

      console.log(queryDataTable);
      let [rows, fields] = await request.query(queryDataTable);
      let row = rows[0];
      let sqlgetdetails = `SELECT * FROM workflow_approval WHERE workflow_id='${row.workflow_id}'`;
      let datadetails = await request.query(sqlgetdetails);
      let details = datadetails[0];
      row.details = details;

      let activitydetails = (row.activity).split(",");
      console.log(activitydetails);
      let activity_array = [];
      for (let i = 0; i < activitydetails.length; i++) {

            let sqlgetactivity = `SELECT * FROM m_activity WHERE activity_code='${activitydetails[i]}'`;
            console.log(sqlgetactivity);
            let dataactivity = await request.query(sqlgetactivity);
            let activity = dataactivity[0][0];
            activity_array.push(activity); 
      }
      row.activity = activity_array;
      return res.success({
        result: row,
        message: "Fetch data successfully"
      });

    } catch (err) {
      return res.error(err);
    }
  },
  // GET ALL RESOURCE
  create: async function (req, res) {
    const {
        workflow_name,division,activity,created_by,details
    } = req.body;

    // await DBPROP;
    try {
      const request = await DBPROP.promise();
      let sqlSequence = `SELECT AUTO_INCREMENT AS workflow_id
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = 'eproposal'
      AND TABLE_NAME = 'workflow'`;
    
      let result = await request.query(sqlSequence);
      let datasequence = result[0];
      let workflow_id = datasequence[0].workflow_id;
      let activity_array = [];
      for (let i = 0; i < activity.length; i++) {
            activity_array.push(activity[i].activity_code); 
      }

      let activitycode = activity_array.toString();
        
      let InsertqueryDataTable = `INSERT INTO workflow
      (workflow_id,workflow_name, division, activity, created_by, created_date, updated_by, updated_date)
      VALUES(${workflow_id},'${workflow_name}','${division}', '${activitycode}','${created_by}',now(),'${created_by}',now())`;
      //console.log(InsertqueryDataTable);

      await request.query(InsertqueryDataTable);

      for (let i = 0; i < details.length; i++) {

        let position_id = details[i].position_id;
        let no_appr = details[i].no_appr;
        let min_limit = details[i].min_limit;
        let max_limit = details[i].max_limit;
        let type_result = details[i].type_result;
        let query = details[i].query;
        let employee_id = details[i].employee_id;
        let script = details[i].script;

        let sqlUpdateDetail = `INSERT INTO workflow_approval
        (workflow_id, position_id, no_appr, min_limit, max_limit, created_by, 
        created_date, updated_date, updated_by, type_result, query, employee_id, script)
        VALUES(${workflow_id}, ${position_id}, '${no_appr}', ${min_limit}, ${max_limit}, 
        '${created_by}', now(), now(), '${created_by}', '${type_result}', '${query}', '${employee_id}', '${script}')`;
        await request.query(sqlUpdateDetail);

      }

      return res.success({
            result:workflow_id,
            message: "Create data successfully"
      });
      
    } catch (err) {
      return res.error(err);
    }
  },

  update: async function (req, res) {
    const {
        workflow_id,workflow_name,division,activity,created_by,details
    } = req.body;

    console.log(req.body);
    // await DBPROP;
    try {
      const request = await DBPROP.promise();
    

      let activity_array = [];
      for (let i = 0; i < activity.length; i++) {
            activity_array.push(activity[i].activity_code); 
      }

      let activitycode = activity_array.toString();

      let updateQueryTable = `
      UPDATE workflow
      SET workflow_name='${workflow_name}', 
      division='${division}', 
      activity='${activitycode}', 
      updated_by='${created_by}', 
      updated_date=now()
      WHERE workflow_id=${workflow_id}`;

      console.log(updateQueryTable);
      await request.query(updateQueryTable);

      for (let i = 0; i < details.length; i++) {

        let workflow_approval_id = details[i].workflow_approval_id;
        let position_id = details[i].position_id;
        let no_appr = details[i].no_appr;
        let min_limit = details[i].min_limit;
        let max_limit = details[i].max_limit;
        let type_result = details[i].type_result;
        let query = details[i].query ? `${details[i].query}` : 'NULL';
        let employee_id = details[i].employee_id ? `'${details[i].employee_id}'` : 'NULL';
        let script = details[i].script ? `'${details[i].script}'` : 'NULL';
        let sqlgetidstatus = `SELECT COUNT(1) AS status FROM workflow_approval WHERE workflow_approval_id=${workflow_approval_id}`;
        let datastatus = await request.query(sqlgetidstatus);
        let status = datastatus[0][0].status;

        query = query.replace(/'/g,"''");

        if(employee_id==`'undefined'` || employee_id==`''` || employee_id==`'NULL'`){
          employee_id = 'NULL';
        }

        if(script==`'undefined'` || script==`''` || script==`'NULL'`){
          script = 'NULL';
        }

        if(query!=='NULL' || query!=='' || query!==`'NULL'` ){
          query = `'${query}'`;
        }else{
          query='NULL';
        }


        if(query==`'undefined'` || query==`''` || query==`'NULL'`){
          query = 'NULL';
        }

        console.log(query);

        if(status==1){

          let sqlUpdateDetail = `UPDATE workflow_approval
          SET position_id=${position_id}, no_appr='${no_appr}', min_limit=${min_limit}, 
          max_limit=${max_limit},
          updated_date=NOW(), 
          updated_by='${created_by}', 
          type_result='${type_result}', query=${query}, employee_id=${employee_id}, script=${script}
          WHERE workflow_approval_id=${workflow_approval_id}`

          console.log(sqlUpdateDetail);
          await request.query(sqlUpdateDetail);
        
        }else{


          let sqlUpdateDetail = `INSERT INTO workflow_approval
          (workflow_id, position_id, no_appr, min_limit, max_limit, created_by, 
          created_date, updated_date, updated_by, type_result, query, employee_id, script)
          VALUES(${workflow_id}, ${position_id}, '${no_appr}', ${min_limit}, ${max_limit}, 
          '${created_by}', now(), now(), '${created_by}', '${type_result}', ${query}, ${employee_id},${script})`;
          console.log(sqlUpdateDetail);
          await request.query(sqlUpdateDetail);
  

        }



      }

      
      return res.success({
        message: "Update data successfully"
      });
      
    } catch (err) {
      return res.error(err);
    }
  },

  delete: async function (req, res) {
    // await DBPROP;
    try {
      const request = await DBPROP.promise();
      
      let queryDeleteDataTableDetails = `DELETE FROM workflow_approval WHERE workflow_id='${req.param(
        "id"
      )}'`;
    
      await request.query(queryDeleteDataTableDetails);
      
      
      let queryDeleteDataTable = `DELETE FROM workflow WHERE workflow_id='${req.param(
        "id"
      )}'`;
    
      await request.query(queryDeleteDataTable);
      
      return res.success({
            message: "Delete data successfully"
      });
      
    } catch (err) {
      return res.error(err);
    }
  },
  deleteDetails: async function (req, res) {
    // await DBPROP;
    try {
      const request = await DBPROP.promise();
      
      let queryDeleteDataTableDetails = `DELETE FROM workflow_approval WHERE workflow_approval_id='${req.param(
        "id"
      )}'`;
  
      await request.query(queryDeleteDataTableDetails);      
      return res.success({
            message: "Delete data successfully"
      });
      
    } catch (err) {
      return res.error(err);
    }
  }
}