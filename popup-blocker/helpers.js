async function postRequest(url, data) {
    return await fetch (url, {
        method: "POST",
        body: JSON.stringify(data) ?? "",
        headers: {
            "Content-Type": "application/json",
        }
    }).then(
            response => response.json()
        )
        .then(data => {
            console.log("postRequest", data)
            return data;
        })
        .catch(function (err) {
            // show error in developer console for debugging
            console.error(err);
        });
}
