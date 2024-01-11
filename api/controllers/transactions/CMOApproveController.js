const Base64 = require('base-64');
const soapRequest = require('easy-soap-request');
const fs = require('fs');
const xml2js = require('xml2js');
const uuid = require("uuid/v4");
const SendEmail = require('../../services/SendEmail');
const moment = require('moment');
const axios = require("axios");

module.exports = {

    approvetosap: async function (req, res) {
        const {startdate,enddate} = req.body;
    
        await DB.poolConnect;
        try {

            return res.success({
                result: "Hallo.....",
                message: "SO Tidak ditemukan"
            });

        } catch (err) {
          return res.error(err);
        }
      }
};