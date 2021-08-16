module.exports = function(RED) {
    function UploadDataNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        node.on('input', function(msg) {
//         node.status({ fill: "yellow", shape: "dot", text: "Executing ..." });
        
          
//             var bodyData = {
//                 type: typeFile,
//                 parent_id: parent_idFile,
//                 name: nameFile,
//                 file:path
//                 }
//               formData = new FormData();
//           formData.append( "body", JSON.stringify( bodyData ) );
        
//           formData.append( "file", path );
        
      
//       return $.ajax( {
//         type: "POST",
//         url: "http://13.66.4.9:8099/uploadFile?userId="+parent_idFile+"&docType="+typeFile,
//         data: bodyData,
//         headers: { otcsticket: otcsticket },
//         beforeSend: function( xhr ) {    
//         xhr.overrideMimeType( "application/x-www-form-urlencoded" )
//         }
//       } ).then(function(response) {
//         msg.payload = response.data;
//         return response;
//       })
//       .catch(function(error) {
//         node.status({ fill: "red", shape: "dot", text: error });
//         console.log(error);
//       })
//       .then(function() {
//           setTimeout(function() {
       
//               node.send(msg);
//               node.status({ fill: "green", shape: "dot", text: "Done" });


//     });
// })
msg.payload = {
    name: this.name,
   
}

node.send(msg);
});
  }
// RED.httpAdmin.post("D:/stage_Hydatis", function (req, res) {
//     var output = [];
//     var fileData = req.body.fileData;
//     // ... parse fileData end produce output
//     res.json(output)
// });
//     }
    RED.nodes.registerType("upload-data",UploadDataNode);
}

