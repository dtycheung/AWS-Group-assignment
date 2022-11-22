function loading(){
    const x = document.getElementById("video").value;
    console.log(x)
    if(x==""){
        document.getElementById("loading").innerHTML = "<h2>Please select a video</h2>";
        return false;
    } else {
        document.getElementById("loading").innerHTML = "<h2>Now Loading...</h2>";

    }
}