d3.csv("data/data_ggsheet-data.csv").then(rawData => {
    const parseDate = d3.timeParse("%Y-%m-%d %H:%M:%S");

    rawData.forEach(d => {
        d["Thời gian tạo đơn"] = parseDate(d["Thời gian tạo đơn"]);
    });
    rawData = rawData.filter(d => d["Thời gian tạo đơn"] !== null);

    rawData.forEach(d => {
        d["Tháng"] = d["Thời gian tạo đơn"].getMonth() + 1;
        d["Mã đơn hàng"] = d["Mã đơn hàng"].trim();
        d["Nhóm gộp"] = `[${d["Mã nhóm hàng"]}] ${d["Tên nhóm hàng"]}`;
        d["Mặt hàng gộp"] = `[${d["Mã mặt hàng"]}] ${d["Tên mặt hàng"]}`;
    });

    const tooltip = d3.select("body").append("div")
        .attr("id", "tooltip")
        .style("position", "absolute")
        .style("background", "#fff")
        .style("padding", "5px")
        .style("border", "1px solid #ccc")
        .style("border-radius", "3px")
        .style("pointer-events", "none")
        .style("opacity", 0);

    const margin = { top: 50, right: 50, bottom: 100, left: 60 };
    const viewBoxWidth = 1300;
    const viewBoxHeight = 1100;

    const groupByMonthGroupItem = d3.rollups(
        rawData,
        v => ({
            count: new Set(v.map(d => d["Mã đơn hàng"])).size
        }),
        d => d["Tháng"],
        d => d["Nhóm gộp"],
        d => d["Mặt hàng gộp"]
    );

    const groupByMonthGroup = d3.rollups(
        rawData,
        v => new Set(v.map(d => d["Mã đơn hàng"])).size,
        d => d["Tháng"],
        d => d["Nhóm gộp"]
    );

    const totalOrdersByGroupMonthObj = {};
    groupByMonthGroup.forEach(([month, groups]) => {
        groups.forEach(([group, count]) => {
            totalOrdersByGroupMonthObj[`${month}-${group}`] = count;
        });
    });

    const data = [];
    groupByMonthGroupItem.forEach(([month, groups]) => {
        groups.forEach(([groupName, items]) => {
            const totalInGroupMonth = totalOrdersByGroupMonthObj[`${month}-${groupName}`] || 1;
            items.forEach(([itemName, itemData]) => {
                data.push({
                    month: +month,
                    group: groupName,
                    item: itemName,
                    count: itemData.count,
                    probability: itemData.count / totalInGroupMonth
                });
            });
        });
    });

    const dataGroup = d3.groups(data, d => d.group);

    const ncols = 3;
    const chartWidth = (viewBoxWidth - margin.left - margin.right * 2) / ncols;
    const chartHeight = 250;
    const rowSpacing = 50;
    const nrows = Math.ceil(dataGroup.length / ncols);

    const svg = d3.select("#chart10");
    svg.selectAll("*").remove();

    svg.append("text")
        .attr("x", viewBoxWidth / 2)
        .attr("y", 30)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Xác suất bán hàng của Mặt hàng theo Nhóm hàng theo từng Tháng");

    dataGroup.forEach(([groupName, groupData], index) => {
        const row = Math.floor(index / ncols);
        const col = index % ncols;
        const xOffset = col * (chartWidth + margin.right);
        const yOffset = row * (chartHeight + margin.bottom + rowSpacing) + 60;

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left + xOffset},${margin.top + yOffset})`);

        g.append("text")
            .attr("x", chartWidth / 2)
            .attr("y", -margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .style("font-weight", "bold")
            .text(groupName);

        const x = d3.scaleLinear()
            .domain([1, 12])
            .range([0, chartWidth]);

        const minY = d3.min(groupData, d => d.probability);
        const maxY = d3.max(groupData, d => d.probability);
        let yDomain;
        if (minY === maxY && minY === 1.0) { 
            yDomain = [0.9, 1.1]; //
        } else {
            yDomain = [Math.max(0, minY - 0.05), Math.min(1, maxY + 0.05)];
        }

        const y = d3.scaleLinear()
            .domain(yDomain)
            .range([chartHeight, 0]);

        const color = d3.scaleOrdinal()
            .domain(groupData.map(d => d.item))
            .range(["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2"]);

        g.append("g")
            .attr("class", "grid")
            .attr("transform", `translate(0, ${chartHeight})`)
            .call(d3.axisBottom(x).ticks(12).tickSize(-chartHeight).tickFormat(""))
            .selectAll(".tick line")
            .attr("stroke", "#ddd");

        g.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(y).ticks(5).tickSize(-chartWidth).tickFormat(""))
            .selectAll(".tick line")
            .attr("stroke", "#ddd");

        g.append("g")
            .attr("transform", `translate(0, ${chartHeight})`)
            .call(d3.axisBottom(x).ticks(12).tickFormat(d => `T${String(d).padStart(2, '0')}`))
            .selectAll("text")
            .style("font-size", "10px");

        g.append("g")
            .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${(d * 100).toFixed(0)}%`))
            .selectAll("text")
            .style("font-size", "10px");

        g.selectAll(".domain").remove();

        const line = d3.line()
            .x(d => x(d.month))
            .y(d => y(d.probability));

        const itemsGroup = d3.groups(groupData, d => d.item);
        itemsGroup.forEach(([itemName, itemData]) => {
            g.append("path")
                .datum(itemData)
                .attr("fill", "none")
                .attr("stroke", color(itemName))
                .attr("stroke-width", 1.5)
                .attr("d", line);

            g.selectAll(`.dot-${itemName.replace(/[^a-zA-Z0-9]/g, '')}`)
                .data(itemData)
                .enter()
                .append("circle")
                .attr("cx", d => x(d.month))
                .attr("cy", d => y(d.probability))
                .attr("r", 3)
                .attr("fill", color(itemName))
                .on("mouseover", (event, d) => {
                    tooltip.style("opacity", 1)
                        .html(`
                            <strong>T${String(d.month).padStart(2, '0')}</strong>
                            | <strong>Mặt hàng: ${d.item}</strong><br>
                            Nhóm hàng: ${d.group} | SL Đơn Bán: ${d.count}<br>
                            Xác suất Bán / Nhóm hàng: ${(d.probability * 100).toFixed(2)}%
                        `)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 10) + "px");
                })
                .on("mouseout", () => {
                    tooltip.style("opacity", 0);
                });
        });

        const legend = g.append("g")
            .attr("transform", `translate(${chartWidth / 2 - 100}, ${chartHeight + 40})`);

        const legendItems = itemsGroup.map(([itemName], i) => ({
            name: itemName,
            color: color(itemName),
            x: (i % 2) * 200,
            y: Math.floor(i / 2) * 15
        }));

        legend.selectAll(".legend-item")
            .data(legendItems)
            .enter()
            .append("g")
            .attr("class", "legend-item")
            .attr("transform", d => `translate(${d.x},${d.y})`)
            .each(function(d) {
                d3.select(this)
                    .append("circle")
                    .attr("cx", 0)
                    .attr("cy", 0)
                    .attr("r", 3)
                    .attr("fill", d.color);

                d3.select(this)
                    .append("text")
                    .attr("x", 8)
                    .attr("y", 3)
                    .style("font-size", "10px")
                    .text(d.name);
            });
    });

    const totalHeight = nrows * (chartHeight + margin.top + margin.bottom + rowSpacing) + 60;
    if (totalHeight > viewBoxHeight) {
        svg.attr("viewBox", `0 0 ${viewBoxWidth} ${totalHeight}`);
    }
}).catch(error => {
    console.error("Lỗi load dữ liệu:", error);
});