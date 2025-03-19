d3.csv("data/data_ggsheet-data.csv").then(function(data) {
    if (!Array.isArray(data) || data.length === 0) {
        console.error("⚠️ Lỗi: CSV rỗng hoặc không hợp lệ!");
        return;
    }

    // Xử lý dữ liệu
    data.forEach(d => {
        d["Thời gian tạo đơn"] = new Date(d["Thời gian tạo đơn"]);
        let hourStart = new Date(d["Thời gian tạo đơn"]);
        hourStart.setMinutes(0, 0, 0);
        let hourEnd = new Date(hourStart);
        hourEnd.setHours(hourEnd.getHours() + 1);

        d["Khung giờ"] = `${d3.timeFormat("%H:%M")(hourStart)} - ${d3.timeFormat("%H:%M")(hourEnd)}`;
        let hourStr = d3.timeFormat("%H")(hourStart);  
        d["Khung giờ"] = `${hourStr}:00 - ${hourStr}:59`;
    });

    let so_ngay_xh = d3.rollup(
        data, 
        v => new Set(v.map(d => d["Ngày"])).size, 
        d => d["Khung giờ"]
    );

    let doanhthu_theogio = d3.rollups(
        data, 
        v => ({
            "Thành tiền": d3.sum(v, d => +d["Thành tiền"] || 0),
            "SL": d3.sum(v, d => +d["SL"] || 0)
        }), 
        d => d["Khung giờ"]
    );

    let processedData = doanhthu_theogio.map(([khungGio, values]) => ({
        "Khung giờ": khungGio,
        "Thành tiền": values["Thành tiền"],
        "SL": values["SL"],
        "Số ngày xuất hiện": so_ngay_xh.get(khungGio) || 1  
    }));

    processedData.forEach(d => {
        d["Ttien_trungbinh"] = Math.round(d["Thành tiền"] / d["Số ngày xuất hiện"]);
        d["SL_Tb"] = Math.round(d["SL"] / d["Số ngày xuất hiện"]);
    });

    processedData.sort((a, b) => {
        let timeA = parseInt(a["Khung giờ"].split(":")[0]);
        let timeB = parseInt(b["Khung giờ"].split(":")[0]);
        return timeA - timeB;
    });

    let maxWidth = 700;
    let maxHeight = 500;
    let margin = { top: 50, right: 30, bottom: 100, left: 80 };
    let width = maxWidth - margin.left - margin.right;
    let height = maxHeight - margin.top - margin.bottom;

    let chartContainer = d3.select("#chart6")
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
        .domain(processedData.map(d => d["Khung giờ"]))
        .range([0, width])
        .padding(0.3);

    let y = d3.scaleLinear()
        .domain([0, d3.max(processedData, d => d["Ttien_trungbinh"])])
        .range([height, 0]);

    let color = d3.scaleSequential(d3.interpolateBlues)
        .domain([0, d3.max(processedData, d => d["Ttien_trungbinh"])]);

    g.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")  
        .style("font-weight", "bold")
        .text("Doanh số bán hàng trung bình theo Khung giờ");

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
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickSize(1));

    g.selectAll(".x-axis text")
        .style("font-size", "10px")  
        .attr("text-anchor", "end")
        .attr("transform", "rotate(45)")
        .attr("dy", "10px") 
        .attr("dx", "60px"); 

    g.append("g")
        .call(d3.axisLeft(y).tickFormat(d => {
            if (d >= 1e6) return (d / 1e6) + "M"; 
            if (d >= 1e3) return (d / 1e3) + "K"; 
            return d;
        }))
        .selectAll("text")
        .style("font-size", "12px");  

    let tooltip6 = d3.select("body").selectAll(".tooltip6");
    if (tooltip6.empty()) {
        tooltip6 = d3.select("body").append("div")
            .attr("class", "tooltip6")
            .style("position", "absolute")
            .style("background", "rgba(39, 44, 47, 0.8)")
            .style("color", "white")
            .style("padding", "8px")
            .style("border-radius", "5px")
            .style("display", "none")
            .style("font-size", "12px");
    }

    g.selectAll(".bar")
        .data(processedData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d["Khung giờ"]))
        .attr("y", d => y(d["Ttien_trungbinh"]))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d["Ttien_trungbinh"]))
        .attr("fill", d => color(d["Ttien_trungbinh"]))
        .on("mouseover", function(event, d) {
            tooltip6.style("display", "block")
                .html(`
                    <strong>${d["Khung giờ"]}</strong><br>
                    Doanh số TB: <strong>${d["Ttien_trungbinh"].toLocaleString("vi-VN")}</strong> VND <br>
                    SL TB: <strong>${d["SL_Tb"].toLocaleString("vi-VN")}</strong>
                `)
                .style("left", (event.pageX - 50) + "px")
                .style("top", (event.pageY - 40) + "px");
        })
        .on("mouseout", function() {
            tooltip6.style("display", "none");
        });

    g.selectAll(".domain").attr("stroke", "black").attr("stroke-width", "1.5px");
    g.selectAll(".tick line").attr("stroke", "#ddd");
}).catch(error => {
    console.error("Lỗi load dữ liệu:", error);
});