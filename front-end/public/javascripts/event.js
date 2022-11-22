// An event listener to submit button
const form = document.getElementById("uploadForm");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const video = document.getElementById("video").files[0];

  const reader = new FileReader();
  let hash;
  document.getElementById("finalLink").innerHTML = "";

  reader.onload = async () => {
    hash = await MD5.generate(reader.result).toString();
    // Check cache to see if video has been processed
    try {
      const response = await fetch(`/redis?hash=${hash}`);
      const data = await response.json();
      let link;
      let exists = false;
      if (data.hashExists) {
        link = data.link;
        exists = true;
      } else {
        const response = await fetch(`/s3request?name=${video.name}&hash=${hash}`);
        const data = await response.json();

        await fetch(data.s3Url, {
          method: 'PUT',
          headers: {
            'Content-Type': `${video.type}`
          },
          body: video
        });
        
        // Once uploaded, request transcode
        const result = await fetch(`/result?hash=${hash}`);
        const resultJson = await result.json();
        link = resultJson.video; 
      }
      if (!link) {
            document.getElementById("loading").innerHTML = "<h2>Unable to connect to server!</h2>";
      } else {
            document.getElementById("finalLink").innerHTML = `<h4><a href="${link}">Transcoded video (right click to save)</a></h4>`;
            document.getElementById("loading").innerHTML = exists ? "<h2>This video has already been transcoded!</h2>" : "<h2>Transcode complete!</h2>";
      }
    } catch (err) {
      console.log(err);
    }
  };
  reader.readAsBinaryString(video);

  var formData = new FormData();
  formData.append("video", video);
});
