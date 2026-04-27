const fs = require('fs');

const path = '/Users/kyuahn/Documents/AVG/AVG Cashflow Management/src/pages/PageDealSummary.jsx';
let content = fs.readFileSync(path, 'utf8');

let newHeaders = `                        <th style={{
                          padding: "10px 12px",
                          textAlign: "left",
                          fontWeight: 700,
                          color: t.text,
                          position: "sticky",
                          left: pivotOffsets[0],
                          top: 0,
                          background: isDark ? "#262626" : "#F9FAFB",
                          zIndex: 50,
                          width: pivotColWidths[0],
                          minWidth: pivotColWidths[0],
                          maxWidth: pivotColWidths[0],
                          borderBottom: \`2px solid \${t.surfaceBorder}\`,
                          borderRight: \`1px solid \${t.surfaceBorder}\`,
                        }}>
                          <div style={{ marginBottom: 8 }}>First Name</div>
                          <input
                            type="text"
                            placeholder="Filter..."
                            value={pivotFilters.firstName}
                            onChange={(e) => setPivotFilters({ ...pivotFilters, firstName: e.target.value })}
                            style={{ width: "100%", fontSize: 10, padding: "4px 6px", borderRadius: 4, background: isDark ? "#1a1a1a" : "#fff", color: t.text, border: \`1px solid \${t.surfaceBorder}\` }}
                          />
                          <div onMouseDown={(e) => handleResize(0, e)} style={{ position: "absolute", right: -3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 60, transition: "background 0.2s" }} onMouseOver={(e) => e.target.style.background = t.accent} onMouseOut={(e) => e.target.style.background = "transparent"} />
                        </th>
                        <th style={{
                          padding: "10px 12px",
                          textAlign: "left",
                          fontWeight: 700,
                          color: t.text,
                          position: "sticky",
                          left: pivotOffsets[1],
                          top: 0,
                          background: isDark ? "#262626" : "#F9FAFB",
                          zIndex: 50,
                          width: pivotColWidths[1],
                          minWidth: pivotColWidths[1],
                          maxWidth: pivotColWidths[1],
                          borderBottom: \`2px solid \${t.surfaceBorder}\`,
                          borderRight: \`1px solid \${t.surfaceBorder}\`,
                        }}>
                          <div style={{ marginBottom: 8 }}>Last Name</div>
                          <input
                            type="text"
                            placeholder="Filter..."
                            value={pivotFilters.lastName}
                            onChange={(e) => setPivotFilters({ ...pivotFilters, lastName: e.target.value })}
                            style={{ width: "100%", fontSize: 10, padding: "4px 6px", borderRadius: 4, background: isDark ? "#1a1a1a" : "#fff", color: t.text, border: \`1px solid \${t.surfaceBorder}\` }}
                          />
                          <div onMouseDown={(e) => handleResize(1, e)} style={{ position: "absolute", right: -3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 60, transition: "background 0.2s" }} onMouseOver={(e) => e.target.style.background = t.accent} onMouseOut={(e) => e.target.style.background = "transparent"} />
                        </th>
                        <th style={{
                          padding: "10px 12px",
                          textAlign: "left",
                          fontWeight: 700,
                          color: t.text,
                          position: "sticky",
                          left: pivotOffsets[2],
                          top: 0,
                          background: isDark ? "#262626" : "#F9FAFB",
                          zIndex: 50,
                          width: pivotColWidths[2],
                          minWidth: pivotColWidths[2],
                          maxWidth: pivotColWidths[2],
                          borderBottom: \`2px solid \${t.surfaceBorder}\`,
                          borderRight: \`1px solid \${t.surfaceBorder}\`,
                        }}>
                          <div style={{ marginBottom: 8 }}>Type</div>
                          <input
                            type="text"
                            placeholder="Filter..."
                            value={pivotFilters.type}
                            onChange={(e) => setPivotFilters({ ...pivotFilters, type: e.target.value })}
                            style={{ width: "100%", fontSize: 10, padding: "4px 6px", borderRadius: 4, background: isDark ? "#1a1a1a" : "#fff", color: t.text, border: \`1px solid \${t.surfaceBorder}\` }}
                          />
                          <div onMouseDown={(e) => handleResize(2, e)} style={{ position: "absolute", right: -3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 60, transition: "background 0.2s" }} onMouseOver={(e) => e.target.style.background = t.accent} onMouseOut={(e) => e.target.style.background = "transparent"} />
                        </th>
                        <th style={{
                          padding: "10px 12px",
                          textAlign: "left",
                          fontWeight: 700,
                          color: t.text,
                          position: "sticky",
                          left: pivotOffsets[3],
                          top: 0,
                          background: isDark ? "#262626" : "#F9FAFB",
                          zIndex: 50,
                          width: pivotColWidths[3],
                          minWidth: pivotColWidths[3],
                          maxWidth: pivotColWidths[3],
                          borderBottom: \`2px solid \${t.surfaceBorder}\`,
                          borderRight: \`1px solid \${t.surfaceBorder}\`,
                        }}>
                          <div style={{ marginBottom: 8 }}>Start Date</div>
                          <input
                            type="text"
                            placeholder="Filter..."
                            value={pivotFilters.startDate}
                            onChange={(e) => setPivotFilters({ ...pivotFilters, startDate: e.target.value })}
                            style={{ width: "100%", fontSize: 10, padding: "4px 6px", borderRadius: 4, background: isDark ? "#1a1a1a" : "#fff", color: t.text, border: \`1px solid \${t.surfaceBorder}\` }}
                          />
                          <div onMouseDown={(e) => handleResize(3, e)} style={{ position: "absolute", right: -3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 60, transition: "background 0.2s" }} onMouseOver={(e) => e.target.style.background = t.accent} onMouseOut={(e) => e.target.style.background = "transparent"} />
                        </th>
                        <th style={{
                          padding: "10px 12px",
                          textAlign: "left",
                          fontWeight: 700,
                          color: t.text,
                          position: "sticky",
                          left: pivotOffsets[4],
                          top: 0,
                          background: isDark ? "#262626" : "#F9FAFB",
                          zIndex: 50,
                          width: pivotColWidths[4],
                          minWidth: pivotColWidths[4],
                          maxWidth: pivotColWidths[4],
                          borderBottom: \`2px solid \${t.surfaceBorder}\`,
                          borderRight: \`1px solid \${t.surfaceBorder}\`,
                        }}>
                          <div style={{ marginBottom: 8 }}>Payment Date</div>
                          <input
                            type="text"
                            placeholder="Filter..."
                            value={pivotFilters.endDate}
                            onChange={(e) => setPivotFilters({ ...pivotFilters, endDate: e.target.value })}
                            style={{ width: "100%", fontSize: 10, padding: "4px 6px", borderRadius: 4, background: isDark ? "#1a1a1a" : "#fff", color: t.text, border: \`1px solid \${t.surfaceBorder}\` }}
                          />
                          <div onMouseDown={(e) => handleResize(4, e)} style={{ position: "absolute", right: -3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 60, transition: "background 0.2s" }} onMouseOver={(e) => e.target.style.background = t.accent} onMouseOut={(e) => e.target.style.background = "transparent"} />
                        </th>
                        <th style={{
                          padding: "10px 12px",
                          textAlign: "left",
                          fontWeight: 700,
                          color: t.text,
                          position: "sticky",
                          left: pivotOffsets[5],
                          top: 0,
                          background: isDark ? "#262626" : "#F9FAFB",
                          zIndex: 50,
                          width: pivotColWidths[5],
                          minWidth: pivotColWidths[5],
                          maxWidth: pivotColWidths[5],
                          borderBottom: \`2px solid \${t.surfaceBorder}\`,
                          borderRight: \`1px solid \${t.surfaceBorder}\`,
                        }}>
                          <div style={{ marginBottom: 8 }}>Freq</div>
                          <input
                            type="text"
                            placeholder="Filter..."
                            value={pivotFilters.freq}
                            onChange={(e) => setPivotFilters({ ...pivotFilters, freq: e.target.value })}
                            style={{ width: "100%", fontSize: 10, padding: "4px 6px", borderRadius: 4, background: isDark ? "#1a1a1a" : "#fff", color: t.text, border: \`1px solid \${t.surfaceBorder}\` }}
                          />
                          <div onMouseDown={(e) => handleResize(5, e)} style={{ position: "absolute", right: -3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 60, transition: "background 0.2s" }} onMouseOver={(e) => e.target.style.background = t.accent} onMouseOut={(e) => e.target.style.background = "transparent"} />
                        </th>
                        <th style={{
                          padding: "10px 12px",
                          textAlign: "left",
                          fontWeight: 700,
                          color: t.text,
                          position: "sticky",
                          left: pivotOffsets[6],
                          top: 0,
                          background: isDark ? "#262626" : "#F9FAFB",
                          zIndex: 50,
                          width: pivotColWidths[6],
                          minWidth: pivotColWidths[6],
                          maxWidth: pivotColWidths[6],
                          borderBottom: \`2px solid \${t.surfaceBorder}\`,
                          borderRight: \`1px solid \${t.surfaceBorder}\`,
                        }}>
                          <div style={{ marginBottom: 8 }}>Rate</div>
                          <input
                            type="text"
                            placeholder="Filter..."
                            value={pivotFilters.rate}
                            onChange={(e) => setPivotFilters({ ...pivotFilters, rate: e.target.value })}
                            style={{ width: "100%", fontSize: 10, padding: "4px 6px", borderRadius: 4, background: isDark ? "#1a1a1a" : "#fff", color: t.text, border: \`1px solid \${t.surfaceBorder}\` }}
                          />
                          <div onMouseDown={(e) => handleResize(6, e)} style={{ position: "absolute", right: -3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 60, transition: "background 0.2s" }} onMouseOver={(e) => e.target.style.background = t.accent} onMouseOut={(e) => e.target.style.background = "transparent"} />
                        </th>
                        <th style={{
                          padding: "10px 12px",
                          textAlign: "left",
                          fontWeight: 700,
                          color: t.text,
                          position: "sticky",
                          left: pivotOffsets[7],
                          top: 0,
                          background: isDark ? "#262626" : "#F9FAFB",
                          zIndex: 50,
                          width: pivotColWidths[7],
                          minWidth: pivotColWidths[7],
                          maxWidth: pivotColWidths[7],
                          borderBottom: \`2px solid \${t.surfaceBorder}\`,
                          borderRight: \`1px solid \${t.surfaceBorder}\`,
                        }}>
                          <div style={{ marginBottom: 8 }}>Schedule</div>
                          <input
                            type="text"
                            placeholder="Filter..."
                            value={pivotFilters.schedule}
                            onChange={(e) => setPivotFilters({ ...pivotFilters, schedule: e.target.value })}
                            style={{ width: "100%", fontSize: 10, padding: "4px 6px", borderRadius: 4, background: isDark ? "#1a1a1a" : "#fff", color: t.text, border: \`1px solid \${t.surfaceBorder}\` }}
                          />
                          <div onMouseDown={(e) => handleResize(7, e)} style={{ position: "absolute", right: -3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 60, transition: "background 0.2s" }} onMouseOver={(e) => e.target.style.background = t.accent} onMouseOut={(e) => e.target.style.background = "transparent"} />
                        </th>
                        <th style={{
                          padding: "10px 12px",
                          textAlign: "left",
                          fontWeight: 700,
                          color: t.text,
                          position: "sticky",
                          left: pivotOffsets[8],
                          top: 0,
                          background: isDark ? "#262626" : "#F9FAFB",
                          zIndex: 50,
                          width: pivotColWidths[8],
                          minWidth: pivotColWidths[8],
                          maxWidth: pivotColWidths[8],
                          borderBottom: \`2px solid \${t.surfaceBorder}\`,
                          borderRight: \`2px solid \${t.surfaceBorder}\`,
                        }}>
                          <div style={{ marginBottom: 8 }}>Payment Method</div>
                          <input
                            type="text"
                            placeholder="Filter..."
                            value={pivotFilters.paymentMethod}
                            onChange={(e) => setPivotFilters({ ...pivotFilters, paymentMethod: e.target.value })}
                            style={{ width: "100%", fontSize: 10, padding: "4px 6px", borderRadius: 4, background: isDark ? "#1a1a1a" : "#fff", color: t.text, border: \`1px solid \${t.surfaceBorder}\` }}
                          />
                          <div onMouseDown={(e) => handleResize(8, e)} style={{ position: "absolute", right: -3, top: 0, bottom: 0, width: 6, cursor: "col-resize", zIndex: 60, transition: "background 0.2s" }} onMouseOver={(e) => e.target.style.background = t.accent} onMouseOut={(e) => e.target.style.background = "transparent"} />
                        </th>`;

let oldHeadersRegex = /<th style={{\s*padding: "10px 12px",\s*textAlign: "left",\s*fontWeight: 700,[\s\S]*?<div style={{ marginBottom: 8 }}>Investor Name<\/div>[\s\S]*?handleResize\(7, e\)[\s\S]*?<\/th>/m;
content = content.replace(oldHeadersRegex, newHeaders);

let newRows = `                            <td style={{
                              padding: "12px 16px",
                              fontWeight: 600,
                              color: t.text,
                              position: "sticky",
                              left: pivotOffsets[0],
                              background: rowBg,
                              zIndex: 30,
                              width: pivotColWidths[0],
                              minWidth: pivotColWidths[0],
                              maxWidth: pivotColWidths[0],
                              borderBottom: \`1px solid \${t.surfaceBorder}\`,
                              borderRight: \`1px solid \${t.surfaceBorder}\`,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }}>
                              <span
                                onClick={() => {
                                  // Can update logic later if needed
                                  // const inv = CONTACTS.find(c => c.first_name === row.firstName && c.last_name === row.lastName);
                                  // if (inv) setDetailContact({ data: inv, view: "simple" });
                                }}
                                style={{
                                  color: isDark ? "#60A5FA" : "#4F46E5",
                                  fontWeight: 600
                                }}
                              >
                                {row.firstName}
                              </span>
                            </td>
                            <td style={{
                              padding: "12px 16px",
                              fontWeight: 600,
                              color: t.text,
                              position: "sticky",
                              left: pivotOffsets[1],
                              background: rowBg,
                              zIndex: 30,
                              width: pivotColWidths[1],
                              minWidth: pivotColWidths[1],
                              maxWidth: pivotColWidths[1],
                              borderBottom: \`1px solid \${t.surfaceBorder}\`,
                              borderRight: \`1px solid \${t.surfaceBorder}\`,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }}>
                              <span
                                style={{
                                  color: isDark ? "#60A5FA" : "#4F46E5",
                                  fontWeight: 600
                                }}
                              >
                                {row.lastName}
                              </span>
                            </td>
                            <td style={{
                              padding: "12px 16px",
                              fontSize: 11,
                              color: t.textSecondary,
                              position: "sticky",
                              left: pivotOffsets[2],
                              background: rowBg,
                              zIndex: 30,
                              width: pivotColWidths[2],
                              minWidth: pivotColWidths[2],
                              maxWidth: pivotColWidths[2],
                              borderBottom: \`1px solid \${t.surfaceBorder}\`,
                              borderRight: \`1px solid \${t.surfaceBorder}\`,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }}>
                              {row.type.replace(/_/g, ' ')}
                            </td>
                            <td style={{
                              padding: "12px 16px",
                              fontSize: 11,
                              color: t.textSecondary,
                              position: "sticky",
                              left: pivotOffsets[3],
                              background: rowBg,
                              zIndex: 30,
                              width: pivotColWidths[3],
                              minWidth: pivotColWidths[3],
                              maxWidth: pivotColWidths[3],
                              borderBottom: \`1px solid \${t.surfaceBorder}\`,
                              borderRight: \`1px solid \${t.surfaceBorder}\`
                            }}>
                              {row.startDate}
                            </td>
                            <td style={{
                              padding: "12px 16px",
                              fontSize: 11,
                              color: t.textSecondary,
                              position: "sticky",
                              left: pivotOffsets[4],
                              background: rowBg,
                              zIndex: 30,
                              width: pivotColWidths[4],
                              minWidth: pivotColWidths[4],
                              maxWidth: pivotColWidths[4],
                              borderBottom: \`1px solid \${t.surfaceBorder}\`,
                              borderRight: \`1px solid \${t.surfaceBorder}\`
                            }}>
                              {row.endDate}
                            </td>
                            <td style={{
                              padding: "12px 16px",
                              fontSize: 11,
                              color: t.textSecondary,
                              position: "sticky",
                              left: pivotOffsets[5],
                              background: rowBg,
                              zIndex: 30,
                              width: pivotColWidths[5],
                              minWidth: pivotColWidths[5],
                              maxWidth: pivotColWidths[5],
                              borderBottom: \`1px solid \${t.surfaceBorder}\`,
                              borderRight: \`1px solid \${t.surfaceBorder}\`
                            }}>
                              {row.freq}
                            </td>
                            <td style={{
                              padding: "12px 16px",
                              fontSize: 11,
                              color: t.textSecondary,
                              position: "sticky",
                              left: pivotOffsets[6],
                              background: rowBg,
                              zIndex: 30,
                              width: pivotColWidths[6],
                              minWidth: pivotColWidths[6],
                              maxWidth: pivotColWidths[6],
                              borderBottom: \`1px solid \${t.surfaceBorder}\`,
                              borderRight: \`1px solid \${t.surfaceBorder}\`
                            }}>
                              {row.rate}
                            </td>
                            <td style={{
                              padding: "12px 16px",
                              fontSize: 11,
                              color: t.textSecondary,
                              position: "sticky",
                              left: pivotOffsets[7],
                              background: rowBg,
                              zIndex: 30,
                              width: pivotColWidths[7],
                              minWidth: pivotColWidths[7],
                              maxWidth: pivotColWidths[7],
                              borderBottom: \`1px solid \${t.surfaceBorder}\`,
                              borderRight: \`1px solid \${t.surfaceBorder}\`
                            }}>
                              {row.scheduleId}
                            </td>
                            <td style={{
                              padding: "12px 16px",
                              fontSize: 11,
                              color: t.textSecondary,
                              position: "sticky",
                              left: pivotOffsets[8],
                              background: rowBg,
                              zIndex: 30,
                              width: pivotColWidths[8],
                              minWidth: pivotColWidths[8],
                              maxWidth: pivotColWidths[8],
                              borderBottom: \`1px solid \${t.surfaceBorder}\`,
                              borderRight: \`2px solid \${t.surfaceBorder}\`
                            }}>
                              {row.paymentMethod}
                            </td>`;

let oldRowsRegex = /<td style={{\s*padding: "12px 16px",\s*fontWeight: 600,[\s\S]*?row\.investor}[\s\S]*?<\/span>\s*<\/td>[\s\S]*?row\.paymentMethod}[\s\S]*?<\/td>/m;
content = content.replace(oldRowsRegex, newRows);

fs.writeFileSync(path, content, 'utf8');
console.log('Update complete.');
