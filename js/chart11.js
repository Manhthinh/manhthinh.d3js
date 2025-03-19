// Đọc dữ liệu CSV
d3.csv("data/data_ggsheet-data.csv").then(rawData => {
    const purchasesByCustomer = d3.rollups(
        rawData,
        v => new Set(v.map(d => d["Mã đơn hàng"])).size,
        d => d["Mã khách hàng"]
    );

    const marginHistogram = { top: 60, right: 50, bottom: 50, left: 60 },
          width = 800 - marginHistogram.left - marginHistogram.right,
          height = 500 - marginHistogram.top - marginHistogram.bottom;

    const svg = d3.select("#chart11")
        .append("svg")
        .attr("width", width + marginHistogram.left + marginHistogram.right)
        .attr("height", height + marginHistogram.top + marginHistogram.bottom)
        .append("g")
        .attr("transform", `translate(${marginHistogram.left},${marginHistogram.top})`);

    
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .style("fill", "#4e79a7")
        .text("Phân phối Lượt mua hàng");

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.85)")
        .style("color", "white")
        .style("padding", "8px 12px")
        .style("border-radius", "6px")
        .style("box-shadow", "2px 2px 10px rgba(0, 0, 0, 0.2)")
        .style("font-size", "14px")
        .style("opacity", 0)
        .style("pointer-events", "none");

    const allPurchases = purchasesByCustomer.map(([_, count]) => count);

    const binGenerator = d3.bin()
        .domain([0.5, 22.5])
        .thresholds(d3.range(1, 23));

    const bins = binGenerator(allPurchases);

    const x = d3.scaleLinear()
        .domain([1, 22])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.length)])
        .range([height, 0])
        .nice();
    
    svg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .tickFormat("")
        );

    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).ticks(22));

    svg.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y));

    svg.selectAll(".hist-bar")
        .data(bins)
        .enter()
        .append("rect")
        .attr("class", "hist-bar")
        .attr("x", d => x(d.x0))
        .attr("y", d => y(d.length))
        .attr("width", d => {
            const barWidth = x(d.x1) - x(d.x0) - 1;
            return barWidth > 0 ? barWidth : 0;
        })
        .attr("height", d => height - y(d.length))
        .attr("fill", "#4e79a7")
        .style("fill-opacity", 1)
        .on("mouseover", function (event, d) {
            d3.select(this).transition().duration(1).attr("fill", "#f28e2c"); // 🔥 Đổi màu khi hover
            tooltip
                .style("opacity", 1)
                .html(`
                    <strong>Lượt mua:</strong> ${Math.round(d.x0)}<br/>
                    <strong>Số KH:</strong> ${d.length}
                `)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 30) + "px");
        })
        .on("mousemove", function (event) {
            tooltip
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 30) + "px");
        })
        .on("mouseout", function () {
            d3.select(this).transition().duration(1).attr("fill", "#4e79a7"); // 🔄 Trả lại màu gốc
            tooltip.style("opacity", 1);
        });

}).catch(error => {
    console.error("Lỗi load dữ liệu:", error);
});
