"""
Builds the sample price list used in the demo.

Written to be a believable document a salon would already have — not a file
shaped to flatter the bot. It deliberately covers prices, hours and booking
policy, and deliberately says nothing about hair extensions, nails or makeup,
so the demo has honest questions the assistant must refuse.
"""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

TEAL = colors.HexColor("#0F766E")
INK = colors.HexColor("#16191D")
MUTED = colors.HexColor("#5F6872")
LINE = colors.HexColor("#E0DDD5")

OUT = Path(__file__).with_name("Tatiana-Beauty-Studio-Price-List-2026.pdf")

styles = getSampleStyleSheet()

title = ParagraphStyle(
    "title", parent=styles["Title"], fontName="Helvetica-Bold",
    fontSize=22, leading=26, textColor=INK, spaceAfter=2,
)
subtitle = ParagraphStyle(
    "subtitle", parent=styles["Normal"], fontName="Helvetica",
    fontSize=10, textColor=MUTED, alignment=TA_CENTER, spaceAfter=14,
)
section = ParagraphStyle(
    "section", parent=styles["Heading2"], fontName="Helvetica-Bold",
    fontSize=12, textColor=TEAL, spaceBefore=14, spaceAfter=6,
)
body = ParagraphStyle(
    "body", parent=styles["Normal"], fontName="Helvetica",
    fontSize=9.5, leading=14, textColor=INK,
)
note = ParagraphStyle(
    "note", parent=body, fontSize=8.5, leading=12, textColor=MUTED,
)


def price_table(rows):
    table = Table(
        [[Paragraph(name, body), Paragraph(detail, note), price] for name, detail, price in rows],
        colWidths=[62 * mm, 65 * mm, 25 * mm],
        hAlign="LEFT",
    )
    table.setStyle(
        TableStyle(
            [
                ("FONT", (2, 0), (2, -1), "Helvetica-Bold", 9.5),
                ("TEXTCOLOR", (2, 0), (2, -1), INK),
                ("ALIGN", (2, 0), (2, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LINEBELOW", (0, 0), (-1, -2), 0.4, LINE),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (0, -1), 0),
            ]
        )
    )
    return table


story = [
    Paragraph("Tatiana Beauty Studio", title),
    Paragraph("Services &amp; prices · valid from 1 January 2026", subtitle),
    HRFlowable(width="100%", thickness=1, color=TEAL, spaceAfter=4),

    Paragraph("Colour", section),
    price_table([
        ("Balayage — shoulder length", "Includes toner and blow-dry. Allow 3 hours.", "$180"),
        ("Balayage — long hair", "Below the shoulder blades. Allow 3.5 hours.", "$220"),
        ("Full highlights", "Includes toner and blow-dry.", "$160"),
        ("Root touch-up", "Regrowth up to 3 cm.", "$90"),
        ("Single-process colour", "One shade, roots to ends.", "$110"),
        ("Toner / gloss refresh", "Between colour appointments.", "$45"),
    ]),

    Paragraph("Cutting &amp; styling", section),
    price_table([
        ("Cut and blow-dry", "Consultation, wash, cut, finish.", "$60"),
        ("Fringe trim", "Free between appointments for colour clients.", "$10"),
        ("Blow-dry only", "Add $10 for hair below the waist.", "$35"),
        ("Special occasion styling", "Weddings and events. Book two weeks ahead.", "$95"),
    ]),

    Paragraph("Treatments", section),
    price_table([
        ("Bond repair treatment", "Recommended with any lightening service.", "$40"),
        ("Deep conditioning mask", "Add to any service.", "$25"),
        ("Scalp treatment", "For dryness and flaking. 30 minutes.", "$30"),
    ]),

    Paragraph("Opening hours", section),
    price_table([
        ("Tuesday – Friday", "Last colour appointment starts 17:00.", "10:00–20:00"),
        ("Saturday", "Last colour appointment starts 15:00.", "09:00–18:00"),
        ("Sunday and Monday", "Closed.", "Closed"),
    ]),

    Paragraph("Booking &amp; cancellation", section),
    Paragraph(
        "We work by appointment only and do not take walk-ins. "
        "Colour services over $200 require a 30% deposit at the time of booking. "
        "Please give us at least 24 hours notice to cancel or reschedule — with less "
        "notice the deposit is kept. "
        "If you are more than 15 minutes late we may need to shorten or reschedule "
        "your appointment so the next client is not delayed.",
        body,
    ),
    Spacer(1, 6),
    Paragraph(
        "A consultation before any colour service is free and takes about 15 minutes. "
        "Book it separately if you have never coloured your hair with us before.",
        body,
    ),

    Paragraph("Find us", section),
    Paragraph(
        "18 Kastryčnickaja Street, Minsk · +375 29 000 00 00 · hello@tatianastudio.by<br/>"
        "Two minutes from Pieršamajskaja metro. Free parking in the courtyard after 18:00.",
        body,
    ),
]

SimpleDocTemplate(
    str(OUT),
    pagesize=A4,
    leftMargin=20 * mm,
    rightMargin=20 * mm,
    topMargin=18 * mm,
    bottomMargin=16 * mm,
    title="Tatiana Beauty Studio — Price List 2026",
    author="Tatiana Beauty Studio",
).build(story)

print(f"written: {OUT.name} ({OUT.stat().st_size:,} bytes)")
