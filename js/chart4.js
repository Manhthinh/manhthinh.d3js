d3.csv("data/data_ggsheet-data.csv").then(function(data) {
    let daysMapping = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

    data.forEach(d => {
        let date = new Date(d["Thời gian tạo đơn"]);
        d["Ngày trong tuần"] = daysMapping[date.getDay()];
        d["Tuần trong năm"] = d3.timeFormat("%Y-%W")(date);
    });

    let weeksCount = d3.rollup(
        data,
        v => new Set(v.map(d => d["Tuần trong năm"])).size,
        d => d["Ngày trong tuần"]
    );

    let salesData = d3.rollup(
        data,
        v => ({
            SL: d3.sum(v, d => +d["SL"]),
            "Thành tiền": d3.sum(v, d => +d["Thành tiền"])
        }),
        d => d["Ngày trong tuần"]
    );

    let processedData = Array.from(salesData, ([day, values]) => ({
        "Ngày trong tuần": day,
        "Tuần trong năm": weeksCount.get(day),
        "SL": values["SL"],
        "Thành tiền": values["Thành tiền"],
        "SL_Tb": Math.round(values["SL"] / weeksCount.get(day)),
        "Ttien_trungbinh": Math.round(values["Thành tiền"] / weeksCount.get(day))
    }));

    let orderDays = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
    processedData.sort((a, b) => orderDays.indexOf(a["Ngày trong tuần"]) - orderDays.indexOf(b["Ngày trong tuần"]));

    let margin = { top: 50, right: 50, bottom: 70, left: 120 },
        width = 700 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    let svg = d3.select("#chart4")
        .style("display", "flex")
        .style("justify-content", "center") 
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    let x = d3.scaleBand()
        .domain(processedData.map(d => d["Ngày trong tuần"]))
        .range([0, width])
        .padding(0.3);

    let y = d3.scaleLinear()
        .domain([0, d3.max(processedData, d => d["Ttien_trungbinh"])])
        .nice()
        .range([height, 0]);

    let colorScale = d3.scaleOrdinal()
        .domain(processedData.map(d => d["Ngày trong tuần"]))
        .range(d3.schemeSpectral[7]);

    let formatCurrency = d3.format(".2s");

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("font-size", "14px");

    svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d => formatCurrency(d).replace("M", "M").replace("G", "B")))
        .selectAll("text")
        .style("font-size", "14px");

    svg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));

    let tooltip = d3.select("body").append("div")
        .attr("class", "tooltip4")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.8)")
        .style("color", "white")
        .style("padding", "8px 12px")
        .style("border-radius", "5px")
        .style("display", "none")
        .style("font-size", "14px");

    let bars = svg.selectAll(".bar")
        .data(processedData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d["Ngày trong tuần"]))
        .attr("y", height)
        .attr("width", x.bandwidth())
        .attr("height", 0)
        .attr("fill", d => colorScale(d["Ngày trong tuần"]))
        .on("mouseover", function(event, d) {
            tooltip.style("display", "block")
                .html(`
                    <strong>${d["Ngày trong tuần"]}</strong><br>
                    💰 Doanh số TB: <strong>${d["Ttien_trungbinh"].toLocaleString("vi-VN")}</strong> VND<br>
                    📦 SL TB: <strong>${d["SL_Tb"]}</strong>
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");

            d3.selectAll(".bar").classed("dimmed", true);
            d3.select(this).classed("dimmed", false);
        })
        .on("mouseout", function() {
            tooltip.style("display", "none");
            d3.selectAll(".bar").classed("dimmed", false);
        });

    bars.transition()
        .duration(1200)
        .attr("y", d => y(d["Ttien_trungbinh"]))
        .attr("height", d => height - y(d["Ttien_trungbinh"]));

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .style("fill", "#4CAF50")
        .text("Doanh số bán hàng trung bình theo Ngày trong tuần");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 50)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Ngày trong tuần");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -80)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Doanh số trung bình (VND)");
});
