document.addEventListener("scroll", function () {
    document.querySelectorAll(".chart-container").forEach(chart => {
        let rect = chart.getBoundingClientRect();
        if (rect.top < window.innerHeight - 100) {
            chart.classList.add("visible");
        }
    });
});