const axios = require("axios");
module.exports = function(RED) {
    function ImportDataNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        var items_array = [] ; 
        //flow.set("individual_items" ,items_array);
        node.on("input", function(msg) {
            node.status({ fill: "yellow", shape: "dot", text: "Executing ..." });
      
            axios
              .get("http://13.66.4.9:8099/all")
              .then(function(response) {
                for (let i = 0; i < response.data.length; i++) {
                   items_array.push(response.data[i])
                  }
                  console.log(items_array);
                msg.payload = response.data;
                return response;
              })
              .catch(function(error) {
                node.status({ fill: "red", shape: "dot", text: error });
                console.log(error);
              })
              .then(function() {
                  setTimeout(function() {
                     
                      node.send(msg);
                      node.status({ fill: "green", shape: "dot", text: "Done" });
      
                 
      
                    }, 8000);
          
              });
      
          });
    }
    RED.nodes.registerType("import-data",ImportDataNode);
}