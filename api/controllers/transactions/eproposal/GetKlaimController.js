
const moment = require("moment");
const DBPROP = require("../../../services/DBPROPOSAL");

module.exports = {


  // GET ALL RESOURCE
  getKlaim: async function (req, res) {
    const{
        document
    } = req.body

    const request = await DBPROP.promise();

    try{

        let sqlgetData = `select a.proposal_id,b.proposal_budget_id,a.doc_no,a.title ,
        proposal_date, a.division_code,a.region_id ,d.region_desc ,e.status_name 
        ,b.branch_code, b.branch_code as branch_desc ,ma.activity_desc,a.company_code ,
        b.brand_code as brand_desc ,total_realisasi ,avg_sales,c.company_desc,
        g.division_sap,
        case when (a.company_code = 'HI' and a.budget_year = '2020') then '11000'
        when (a.company_code = 'SEI' and a.budget_year = '2020') then '120000'
        when (a.company_code = 'MI') then '210000' 
        else '210000'
        end
        as profit_center,ma.activity_code ,a.budget_year ,
        start_date, end_date,monthname(str_to_date(b.bulan,'%m')) as bulan_desc,
        DATE_ADD(end_date, INTERVAL 2 MONTH) finish,
        DATE_ADD(end_date, INTERVAL 14 MONTH) finish_mt,
        case when nilai_so > 0 then nilai_so else b.budget end budget 
        from proposal a 
            join proposal_budget b on a.proposal_id = b.proposal_id 
            join m_activity ma on ma.activity_code = b.activity_id  and ma.company_desc = a.company_code and ma.year = a.budget_year
            join m_company c on c.company_code = a.company_code 
            JOIN m_region d on d.region_id = a.region_id 
            join m_status e on e.status_id = a.status_id 
            join m_division g on g.division_code = a.division_code and g.company_desc = a.company_code 
        where a.doc_no = '${document}'  and a.status_id = 30
        order by a.proposal_date desc`;

        console.log(sqlgetData);


        let dataproposal = await request.query(sqlgetData);
        let dataklaim = dataproposal[0];
        let dataklaimHead = dataproposal[0][0];

        let arrayLines = [];

        let data = {
            proposal_id: dataklaimHead.proposal_id,
            no_doc: dataklaimHead.doc_no,
            title: dataklaimHead.title,
            budget_awal_bgt: dataklaimHead.budget_awal,
            date_prop: dataklaimHead.proposal_date,
            divisi: dataklaimHead.division_code,
            comp: dataklaimHead.company_desc,
            region: dataklaimHead.region_desc,
            status: dataklaimHead.status_name,
            start_date: dataklaimHead.start_date,
            end_date: dataklaimHead.end_date,
            cost_center: dataklaimHead.division_sap,
            profit_center: dataklaimHead.profit_center,
            company_code: dataklaimHead.company_code,
            region_id: dataklaimHead.region_id,
            budget_year: dataklaimHead.budget_year,
            finish: dataklaimHead.finish,
            finish_mt: dataklaimHead.finish_mt
        }


        let budget_awal_bgt = 0;

        for (let i = 0; i < dataklaim.length; i++) {
            

                budget_awal_bgt = budget_awal_bgt + dataklaim[i].budget;

                let no_proposal = dataklaim[i].doc_no;
                let comp_id = dataklaim[i].profit_center;
                let company = dataklaim[i].company_code;
                let budget_id = dataklaim[i].proposal_budget_id;
                let branch_code = dataklaim[i].branch_code;
                let branch_desc = dataklaim[i].branch_desc;
                let activity = dataklaim[i].activity_desc;
                let title = dataklaim[i].title;
                let brand = dataklaim[i].brand_desc;
                let activity_code = dataklaim[i].activity_code;
                let budget = dataklaim[i].budget;
                let region = dataklaim[i].region_id;
                let date_prop = dataklaim[i].proposal_date;
                let profitcenter = dataklaim[i].profit_center;
                let cost_center = dataklaim[i].division_sap;
                let divisi = dataklaim[i].division_code;
                let budget_awal = 0;
                let bulan_desc = dataklaim[i].bulan_desc;

                arrayLines.push({
                    no_proposal:no_proposal,
                    comp_id:comp_id,
                    company:company,
                    budget_id:budget_id,
                    branch_code:branch_code,
                    branch_desc:branch_desc,
                    activity:activity,
                    title:title,
                    brand:brand,
                    activity_code:activity_code,
                    budget:budget,
                    region:region,
                    date_prop:date_prop,
                    profitcenter:profitcenter,
                    cost_center:cost_center,
                    divisi:divisi,
                    budget_awal:budget_awal,
                    bulan_desc:bulan_desc
                });
            
        }

        console.log(arrayLines);
        data.budget_awal_bgt = budget_awal_bgt;
        data.line = arrayLines;



    return res.success({
        result: data,
        message: "Fetch data successfully"
    });
      
    } catch (err) {
      return res.error(err);
    }
  },


}