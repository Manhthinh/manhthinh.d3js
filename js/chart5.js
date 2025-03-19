d3.csv("data/data_ggsheet-data.csv").then(function(data) {
    if (!Array.isArray(data) || data.length === 0) {
        console.error("⚠️ Lỗi: CSV rỗng hoặc không hợp lệ!");
        return;
    }
    data.forEach(d => {
        d["Thời gian tạo đơn"] = new Date(d["Thời gian tạo đơn"]);
        d["Ngày trong tháng"] = d3.timeFormat("Ngày %d")(d["Thời gian tạo đơn"]);
        d["ngay_trong_nam"] = d3.timeFormat("%Y-%m")(d["Thời gian tạo đơn"]);
    });

    let so_ngay_trongthang = d3.rollup(
        data, 
        v => new Set(v.map(d => d["ngay_trong_nam"])).size, 
        d => d["Ngày trong tháng"]
    );

    let tong_doanh_thu_theo_ngay = d3.rollups(
        data, 
        v => ({
            "Thành tiền": d3.sum(v, d => +d["Thành tiền"] || 0),
            "SL": d3.sum(v, d => +d["SL"] || 0)
        }), 
        d => d["Ngày trong tháng"]
    );

    let processedData = tong_doanh_thu_theo_ngay.map(([ngay, values]) => ({
        "Ngày trong tháng": ngay,
        "Thành tiền": values["Thành tiền"],
        "SL": values["SL"],
        "ngay_trong_nam": so_ngay_trongthang.get(ngay) || 1 
    }));

    processedData.forEach(d => {
        d["Ttien_trungbinh"] = Math.round(d["Thành tiền"] / d["ngay_trong_nam"]);
        d["SL_Tb"] = Math.round(d["SL"] / d["ngay_trong_nam"]);
    });
    processedData.sort((a, b) => a["Ngày trong tháng"].localeCompare(b["Ngày trong tháng"]));

    let maxWidth = 750;
    let maxHeight = 600;
    let margin = { top: 60, right: 20, bottom: 50, left: 150 };
    let width = maxWidth - margin.left - margin.right;
    let height = maxHeight - margin.top - margin.bottom;

    let chartContainer = d3.select("#chart5")
        .style("display", "flex")
        .style("justify-content", "center")
        .style("align-items", "center")
        .style("height", "100vh");  

    let svg = chartContainer.select("svg");
    if (svg.empty()) {
        svg = chartContainer.append("svg")
            .attr("width", maxWidth)
            .attr("height", maxHeight)
            .attr("viewBox", `0 0 ${maxWidth} ${maxHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet");
    }
    svg.selectAll("*").remove();

    let g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    let x = d3.scaleBand()
        .domain(processedData.map(d => d["Ngày trong tháng"]))
        .range([0, width])
        .padding(0.2);

    let y = d3.scaleLinear()
        .domain([0, d3.max(processedData, d => d["Ttien_trungbinh"])])
        .range([height, 0]);

    let color = d3.scaleSequential(d3.interpolateSpectral)
        .domain([0, d3.max(processedData, d => d["Ttien_trungbinh"])]);

    g.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "20px")
        .style("font-weight", "bold")
        .text("Doanh số bán hàng trung bình theo Ngày");

    g.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).ticks(processedData.length).tickSize(-height).tickFormat(""))
        .selectAll(".tick line")
        .attr("stroke", "#ddd");

    g.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickFormat(""))
        .selectAll(".tick line")
        .attr("stroke", "#ddd");

    g.append("g")
        .attr("class", "x-axis") 
        .attr("transform", `translate(2,${height})`) 
        .call(d3.axisBottom(x).tickSize(1));
    
    g.selectAll(".x-axis text") 
        .style("font-size", "11px")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(45) translate(30,5)"); 

    g.append("g")
        .call(d3.axisLeft(y).tickFormat(d => {
            if (d >= 1_000_000) {
                return (d / 1_000_000).toFixed(0) + "M";
            } else {
                return d.toLocaleString("vi-VN");
            }
        }))
        .selectAll("text")
        .style("font-size", "12px");

    let tooltip5 = d3.select("body").selectAll(".tooltip5");
    if (tooltip5.empty()) {
        tooltip5 = d3.select("body").append("div")
            .attr("class", "tooltip5")
            .style("position", "absolute")
            .style("background", "rgba(39, 44, 47, 0.8)")
            .style("color", "white")
            .style("padding", "10px")
            .style("border-radius", "5px")
            .style("display", "none")
            .style("font-size", "12px");
    }

    g.selectAll(".bar")
        .data(processedData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d["Ngày trong tháng"]) + x.bandwidth() / 4)
        .attr("y", d => y(d["Ttien_trungbinh"]))
        .attr("width", x.bandwidth() / 2)
        .attr("height", d => height - y(d["Ttien_trungbinh"]))
        .attr("fill", d => color(d["Ttien_trungbinh"]))
        .on("mouseover", function(event, d) {
            tooltip5.style("display", "block")
                .html(`
                    <strong>${d["Ngày trong tháng"]}</strong><br>
                    Doanh số TB: <strong>${d["Ttien_trungbinh"].toLocaleString("vi-VN")}</strong> VND <br>
                    SL TB: <strong>${d["SL_Tb"].toLocaleString("vi-VN")}</strong>
                `)
                .style("left", (event.pageX - 60) + "px")
                .style("top", (event.pageY - 60) + "px");
        })
        .on("mouseout", function() {
            tooltip5.style("display", "none");
        });

    g.selectAll(".domain").attr("stroke", "black").attr("stroke-width", "1.5px");
    g.selectAll(".tick line").attr("stroke", "#ddd");
}).catch(error => {
    console.error("Lỗi load dữ liệu:", error);
});