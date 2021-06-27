const axios = require("axios");
const axiosRetry = require("axios-retry");
const fetch = require("node-fetch");
const Promise = require("bluebird");
const moment = require("moment");
const converter = require("json-2-csv");
const fs = require("fs");

const config = require("../config.js");

// API retries for Jira status code 429

axiosRetry(axios, {
  retries: 3, // number of retries
  retryDelay: (retryCount) => {
    console.log(`retry attempt: ${retryCount}`);
    return retryCount * 2000; // time interval between retries
  },
  retryCondition: (error) => {
    // if retry condition is not specified, by default idempotent requests are retried
    return error.response.status === 429;
  },
});

// Extracting Jira-Issue numbers

// rawData includes Jira issue jeys extracted from raw Jira csv report
var rawData = [];

// reportData includes final report in JSON format
var reportData = [];


// Converting raw data csv to json

const csvFilePath = "data/raw_data_10_4_20.csv";
const csv = require("csvtojson");

csv()
  .fromFile(csvFilePath)
  .then((jsonObj) => {
    // console.log(((jsonObj[0]['Issue key'])));
    // console.log(jsonObj[0]['Issue key'].slice(3));
    for (var key in jsonObj) {
      rawData[key] = jsonObj[key]["Issue key"];
    }
    // console.log(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
      generateReportData(rawData[i]);
      // break;
    }
  });

// Generating Time in status report by calling Jira API

const generateReportData = (key) => {
  axios({
    method: "get",
    url: `https://latchel.atlassian.net/rest/api/3/issue/${key}/changelog`,
    auth: {
      username: "amit@latchel.com",
      password: config.apiKey,
    },
  })
    .then((response) => {
      return response.data;
    })
    .then((text) => {
      let allChanges = text["values"];
      let date = new Date(allChanges[0]["created"]);
      let status = "To Do";

      let reportObject = {};
      reportObject.key = key,
      reportObject.createdBy = allChanges[0]["author"]["displayName"],
      reportObject.createdDate = moment(allChanges[0]["created"]).format("MMM Do YYYY");
      reportObject["To Do"] = 0;
      reportObject["In Progress"] = 0;
      reportObject["Peer Review"] = 0;
      reportObject["Testing"] = 0;
      reportObject["Ready to Deploy"] = 0;

      for (let i = 1; i < allChanges.length; i++) {
        let changeArray = allChanges[i]["items"];

        if (allChanges[i]["items"][0]["field"] === "status") {
          let timeInStatus =
            Math.round(
              (new Date(allChanges[i]["created"]).getTime() - date.getTime()) /
                (60 * 60 * 24 * 1000)
            ) || 1;
          reportObject[status] += timeInStatus;
          status = allChanges[i]["items"][0]["toString"];
          date = new Date(allChanges[i]["created"]);
        }

        if (allChanges[i]["items"].length > 1) {
          if (allChanges[i]["items"][1]["field"] === "status") {
            let timeInStatus =
              Math.round(
                (new Date(allChanges[i]["created"]).getTime() -
                  date.getTime()) /
                  (60 * 60 * 24 * 1000)
              ) || 1;
            reportObject[status] += timeInStatus;
            status = allChanges[i]["items"][1]["toString"];
            date = new Date(allChanges[i]["created"]);
          }
        }
      }

      reportData.push(reportObject);

      if (reportData.length === rawData.length) {
        console.log(reportData.length);
        converter.json2csv(reportData, (err, csv) => {
          if (err) throw err;
          console.log("csv");
          fs.writeFile("data/report.csv", csv, (err) => {
            if (err) throw err;
            console.log("csv saved");
          });
        });
      }
    })
    .catch((err) => console.log(err.response.status));
};
