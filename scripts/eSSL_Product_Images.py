from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

from pymongo import MongoClient

BASE = "https://attendancemachine.in/cdn/shop/files/"
ROOT_DIR = Path(__file__).resolve().parent.parent
JSON_PATH = Path(__file__).resolve().with_name("eSSL.json")
ENV_PATH = ROOT_DIR / ".env"
DEFAULT_COLLECTION = "products"
NULL_VALUE = "NULL"
IMAGE_WIDTH = 1200
IMAGE_HEIGHT = 900

# Comprehensive image map built from all collection pages scraped
image_map = {
    # Fingerprint Recognition
    "X990": BASE + "x990_f92abca8-a96c-4783-a45e-132b58ae0ed9.png",
    "IClock990": BASE + "iclock990.png",
    "VEGA+W+POE": BASE + "vega-w-poe.png",
    "F18": BASE + "f18_d0207710-71be-4666-a36f-3791d3e3db56.png",
    "F22+ID+WIFI": BASE + "f22-id-wifi.png",
    "SF100": BASE + "sf100_5f75c1ee-880c-40d2-8eae-2d0f17725418.png",
    "K30PRO": BASE + "k30pro.png",
    "FR1200": BASE + "fr1200_6cc1f114-c49f-4690-8167-09011671698f.png",
    "X7": BASE + "x7_031170d7-07c5-462b-aa36-46123fdfbced.png",
    "P160": BASE + "p160_65fa58ea-289d-4710-b546-08de954b7f4b.png",
    "Silk-FP-101TA": BASE + "silk-fp-101ta_efdb432c-5c56-49a2-bf20-dac30f1f8284.png",
    "WL20": BASE + "wl20.png",  # will search below
    "UA300": BASE + "ua300_50b0d19b-6ebf-4756-8841-4ad06c2e8ea8.png",
    "U460": BASE + "u460_e3727f02-e1bf-40f7-ad06-76c99e1cc30f.png",
    "MA500": BASE + "ma500_a21d93b7-e2b4-480f-9326-dd447ac9b1d7.png",
    "eSSL9500": BASE + "essl9500_74ef3233-0013-402d-9856-34272993c7c1.png",
    "iClock360": BASE + "iclock360_32f64664-ee86-414b-958c-0945d7834294.png",
    "F6": BASE + "f6.png",
    "E9C Wi-Fi": BASE + "e9c-wi-fi_c9b3809c-a23a-4b11-932b-26e93c58a1e0.png",
    "K90 Pro": BASE + "k90-pro.png",
    "K21 Pro": BASE + "k21-pro.png",
    # Face Recognition
    "Aiface Vesta+POE": BASE + "aiface-vesta-poe.png",  # will search
    "AIFACE SUN+POE": BASE + "aiface-sun-poe.png",  # will search
    "AI-FACE-ORCUS": BASE + "ai-face-orcus.png",
    "AI-FACE-ARION": BASE + "ai-face-arion_f2642e15-d3c6-424b-8ec5-a6a4daaa6157.jpg",
    "AI-FACE ARION+HID": BASE + "ai-face-arion-hid_9bf2dfa4-9023-4fc8-a0f6-4be4eeef328e.jpg",
    "AI-FACE MAGNUM": BASE + "ai-face-magnum.png",
    "AI-FACE MAGNUM-LITE": BASE + "ai-face-magnum-lite.jpg",
    "AI-FACE MARS": BASE + "ai-face-mars.png",
    "AI-FACE MARS+HID": BASE + "ai-face-mars-hid.png",
    "AI-FACE ERIS": BASE + "ai-face-eris.jpg",
    "AI-FACE ERIS+HID": BASE + "ai-face-eris-hid.jpg",
    "AI-FACE MARS+QR": BASE + "ai-face-mars-qr.jpg",
    "AI-FACE PLUTO-NEW": BASE + "ai-face-pluto-new.png",
    "AI-FACE MERCURY": BASE + "ai-face-mercury.png",
    "AI-FACE NEPTUNE": BASE + "ai-face-neptune.png",
    "AI-FACE URANUS": BASE + "ai-face-uranus.png",
    "AI-FACE-JUPITER": BASE + "ai-face-jupiter.png",
    "AI-FACE-JUPITER+HID": BASE + "ai-face-jupiter-hid.png",
    "EFACE990": BASE + "eface990.png",
    "UFACE302": BASE + "uface302.png",
    "SILKBIO101TC": BASE + "silkbio101tc.png",
    "MB160": BASE + "mb160.png",
    "MB20": BASE + "mb20.png",
    "UFACE301": BASE + "uface301.png",
    "SFace900": BASE + "sface900.png",  # will search
    # Boom Barrier
    "BB-Radar": BASE + "bb-radar.png",
    "BG-DC-101": BASE + "bg-dc-101.png",
    "BG180-BDC": BASE + "bg180-bdc_70067b64-c831-4d0c-88a5-de90dc7612c3.png",
    "BG100 TI": BASE + "bg100-ti_b20ee120-66ee-4635-b5b9-c7b5b0206dd9.jpg",
    "BG100 TII": BASE + "bg100-tii_75254bf1-4823-468b-b517-7f9919cf2974.jpg",
    "BG-100(6M) GREY": BASE + "bg-100-grey_4941d377-ada1-4f4a-aebd-9cfc1ccfc03e.png",
    "BG-108 (8M)": BASE + "bg-108-8m_5f90e4b5-9747-4fd2-a019-874b76262361.png",
    "BG-S-105 (2M)": BASE + "bg-s-105_fcc9841e-8ff2-4234-96cc-3bef85439f55.png",
    "BG-SC-300": BASE + "bg-sc-300_c60f9fb9-e0d6-4c73-8d18-d448181540df.png",
    "BGL-100": BASE + "bgl-100.png",
    "BG-CM-300": BASE + "bg-cm-300_c907a653-b02a-44c3-869b-a8bf39f7546d.png",
    "Switch SW01": BASE + "SW01.png",
    "Photo Cell PSA26": BASE + "PSA26.png",
    "Wireless Photo Cell PSA122": BASE + "psa122.png",  # will search
    "Loop Detector - PSA02": BASE + "psa02-2-loop-detector-1.png",
    "Loop Detector - PSA02-2": BASE + "psa02-2-loop-detector-1.png",
    "Boom Barrier P-PB-Remote": BASE + "boom-barrier-p-pb-remote.png",  # will search
    # Turnstiles
    "ET-1000": BASE + "et-1000.png",
    "ET-1200": BASE + "et-1200_b09025fb-6d68-4b0d-a9ad-c5ec82f37a2f.png",
    "ET-1219": BASE + "et-1219_dc9bee4b-03f9-4ff0-bd5d-74eb26d55758.png",
    "ET-2000": BASE + "et-2000.png",
    "ETA-1000 (Automatic)": BASE + "eta-1000_53994437-7c56-4b94-b0c0-71cff768a327.png",
    "ETA-2000 (Automatic)": BASE + "eta-2000_0f7db96b-4414-41fb-bd74-5989f1ae710c.png",
    "FHT-TL-132": BASE + "fht-tl-132_02489c12-0421-4c6e-a38e-13b62d03bb55.png",
    "FHT-TL-232": BASE + "fht-tl-232_0dd76a78-ceea-42b5-8317-2aa95e95dc63.png",
    "FHT-TL-139": BASE + "fht-tl-139_17da01a2-b2aa-4433-8211-fd389efe0fac.png",
    "FHT-TL-149": BASE + "fht-tl-149_e8115313-b633-4751-9140-5c1b7806d50b.png",
    "FHT-TL-239": BASE + "fht-tl-239_e709b902-01b5-42c8-9a04-9bdc02f94184.png",
    "FHT-TL-249": BASE + "fht-tl-249_285ad3c0-90be-4bf2-a94e-d72f6f5bb46e.png",
    "FHT-TL-537": BASE + "fht-tl-537.jpg",
    "HHT-TL-139": BASE + "hht-tl-139.png",
    # Flap Barriers
    "FB-E-1000": BASE + "fb-e-1000.png",
    "FB-E-1200": BASE + "fb-e-1200_6a252837-9809-4af2-85fe-7ac945ff9fce.png",
    "FB-E-2000 Series": BASE + "fb-e-2000_9bb15279-777e-48c0-9683-980e9ff3a34c.png",
    "FB-E-2200": BASE + "fb-e-2200_8eb2ad49-d466-44ed-8819-7c17d10c2764.png",
    "FB-E-2216": BASE + "fb-e-2216_1cbb2480-d5b4-47f6-a411-9cd5c99e2c66.png",
    "FB-EF-2213": BASE + "fb-ef-2213_d54399c6-416f-4717-be26-4743cf1c2322.png",
    "FB-Y-1000": BASE + "fb-y-1000.jpg",
    "FB-Y-1200": BASE + "fb-y-1200_b23a2f5b-3354-4df0-adc3-cb750623f610.jpg",
    # Swing Barriers
    "SB-E315": BASE + "sb-e315_d2139de2-f9ae-4ff6-99c1-73dd8411d2b3.png",
    "SB-ES-3216": BASE + "sb-es-3216.jpg",
    "SB-ES-3216-2": BASE + "sb-es-3216-2.jpg",
    "SB-ES-3218": BASE + "sb-es-3218_05faba3f-9821-42c6-b4b1-67c8c111d99b.jpg",
    "SB-TL-129": BASE + "sb-tl-129_d8e5f552-cb60-4b55-b9ca-077f671d54be.png",
    "SB-ES-3012": BASE + "sb-es-3012_377ea0b9-91d3-4ba8-a5b4-1e232ee16e4a.png",
    "SB-ES-3012-2": BASE + "sb-es-3012-2_302a329b-4659-4e5e-99d8-459e185a4271.png",
    "SB-SPL-310": BASE + "sb-spl-310_547cebb6-2709-46fc-8dc3-6cb55f935e7a.png",
    # Walk-Through Metal Detectors
    "D270-1-IP54": BASE + "d270-1-ip54.jpg",
    "D270-9-IP54": BASE + "d270-9-ip54.jpg",
    "D270-18-IP54": BASE + "d270-18-ip54.jpg",
    "D270-18-IP65": BASE + "d270-18-ip65.jpg",
    "D330-18-IP65": BASE + "d330-18-ip65.jpg",
    "D330-33-IP65": BASE + "d330-33-ip65_6d65541a-8aa8-4867-a1a3-306b36b34ff9.jpg",
    "D518-63-IP65": BASE + "d518-63-ip65_68ae6cf1-f22f-48d6-88bc-8e129e36eae9.png",
    "D468-6": BASE + "d468-6_ee307994-8d7b-43b7-9baf-b832d1d1057d.jpg",
    "D4006": BASE + "d4006_f7bad41e-cf11-49f8-9c77-97fcb1655994.jpg",
    # Hand-Held Metal Detectors
    "HM300": BASE + "hm300_4e6d8bed-3ae1-49b5-a75c-2413b3060a42.png",
    "HM520Pro": BASE + "hm520pro.png",
    "HM100180": BASE + "hm100180.png",
    # Shoes Scanner
    "eSS05-Shoes Scanner": BASE + "ess05.png",
    # Swing Gate Openers
    "GO-I-28": BASE + "go-i-28_43080dd5-5470-4def-918e-c8d69fd6e9f6.png",
    "GO-O-29": BASE + "go-o-29_46d6e90d-0f8b-4493-8f2d-6c779116e854.png",
    "GO-O-19": BASE + "go-o-19_5c2cbc3a-53a5-4fba-9623-8231c6965c23.png",
    "GO-O-03": BASE + "go-o-03_f1b5a393-836b-4024-aa80-162d62a061ce.png",
    # Shutter & Garage Door Openers
    "SH-GT3.50-ZM": BASE + "sh-gt350-zm_cd052fa2-d56b-4c52-889f-dc3d387b6e83.png",
    "SH-GT5.75-ZM": BASE + "sh-gt575-zm_418ca2ec-df5d-4178-9374-423d36844961.png",
    "SH-GT16DC": BASE + "sh-gt16dc_bd62994e-4dcc-4415-80e7-e069bcbfa35c.png",
    "SH-JMT40": BASE + "sh-jmt40_e6b58713-ea8c-4807-9a11-52b2d55d5d6f.png",
    # Sliding Gate Units
    "HG-BDC-600": BASE + "hg-bdc-600_af7d5fd6-42d7-473f-ace2-cd49e4c05cb0.png",
    "HG-BDC-800": BASE + "hg-bdc-800_5efe24ba-ce11-4760-8b24-e1fc80c2dd3c.png",
    "eSSL-HG-1500": BASE + "essl-hg-1500_b52076f4-3146-46a4-95da-46957432e87a.png",
    "HG-2000": BASE + "hg-2000_92aee72f-f00f-4d70-964b-62ea14004bd3.png",
    # Door Controllers
    "C3-100": BASE + "c3-100_73320bf6-9ef8-4895-b4bb-aeb6cacab85d.png",
    "C3-200": BASE + "c3-200_f76f801c-beb0-4770-af7d-8885ca7913a5.png",
    "C3-400": BASE + "c3-400.png",
    "C3-100 Plus": BASE + "c3-100-plus.png",
    "C3-200 Plus": BASE + "c3-200-plus.png",
    "C3-400 Plus": BASE + "c3-400-plus.png",
    "INBIO260": BASE + "inbio260.png",
    "INBIO460": BASE + "inbio460.png",
    "InBio-160 Pro Plus": BASE + "inbio-160-pro-plus_348d936a-0d7f-42cc-b41d-04f28beb9282.png",
    "InBio-260 Pro Plus": BASE + "inbio-260-pro-plus_0690b3da-6d0a-4a16-bf45-273c7d387777.png",
    "InBio-460 Pro Plus": BASE + "inbio-460-pro-plus_a212e5f5-bdf6-4d4b-b9f3-129c41f5bf4b.png",
    "EC10-EX16": BASE + "ec10-ex16_581199d1-5d60-446d-bf55-6c6d75fa1828.png",
    "eSSL-Access-8002": BASE + "essl-access-8002.png",
    "eSSL-Access-8004": BASE + "essl-access-8004.png",
    "EC-20M-EC-20K": BASE + "ec-20m-ec-20k_5340867a-0a9b-4297-a062-c8b5d3df9895.png",
    # Bollards
    "HB-426": BASE + "hb-426.jpg",
    "RB-219": BASE + "rb-219.png",
    "TK-300": BASE + "tk-300.png",
    "TK-400": BASE + "tk-400_ebd48421-5460-42d0-95cb-a802fbf80c06.png",
    "TK-600": BASE + "tk-600.png",
    # Aadhar Authentication
    "Emerald Face": BASE + "emerald_2a7724d2-9a46-4586-9137-2dde7b346dda.jpg",
    "Emerald Fingerprint": BASE + "emerald_2a7724d2-9a46-4586-9137-2dde7b346dda.jpg",
    # Fingerprint Door Locks
    "FL600": BASE + "fl600_7b8d3b9e-a574-463e-b055-89d31d7f54b8.png",
    "FL500": BASE + "fl500.png",
    "FL400": BASE + "fl400_0dd50f78-96ab-4d02-951b-1fefca61e7da.png",
    "FL600-SS": BASE + "fl600-ss_29300e87-331b-40f6-b04e-e47ddf21d964.png",
    "FL700": BASE + "fl700_871c9298-8f1f-4665-be53-3f14cbca5e75.png",
    "FL-W-800": BASE + "fl-w-800_4161dc1d-013d-4efb-a6d1-26af4866ebb1.png",
    "FL900-60": BASE + "fl900-60_43761b94-9f1d-400e-adbd-a568345acc28.png",
    "FL900": BASE + "fl900_5a87a590-e058-4fd5-a19a-e46ed0d2d7fb.png",
    "GL400 Plus": BASE + "gl400-plus_46401140-073b-4e02-bc8b-4d660587e0f7.png",
    "FL100M": BASE + "fl100m.png",  # not found with image, use similar
    "FL200M": BASE + "fl200m.png",
    "FL300": BASE + "fl300_6ca70376-e9ac-4543-bcff-a1a92f2f185f.png",
    "TL 200": BASE + "tl-200_f905cbec-fd3b-498d-b6b1-1c363bdf80c5.png",
    "TL400B": BASE + "tl400b_17b5ea91-48df-4e6e-abc3-9d70c810f9ab.png",
    # Hotel Locks
    "HL700": BASE + "hl700.png",  # will search
    "HL600": BASE + "hl600_fea08045-7120-4480-b78d-9949a8714acc.png",
    "HL500": BASE + "hl500_72db5226-eda2-4a16-8728-57504007a7cc.png",
    "HL400": BASE + "hl400_989ea7f6-ae52-4e92-ab42-41ecf8636a39.png",
    "HLSW-MF-Grey": BASE + "hlsw-mf-grey_a6fa809e-ba3c-4e80-82b4-47366679b0a7.png",
    "HLSW-MF-White": BASE + "hlsw-mf-white_4e9cdde4-4959-4945-91f2-287ec892147a.png",
    "HL-100": BASE + "hl-100_6919d1e7-4872-4321-94d9-6212834d9398.png",
    "HL-200": BASE + "hl-200.png",  # not found with image
    "S50": BASE + "s50_619b7a1b-dcb0-4217-b478-5c6c40b79526.png",
    "S70": BASE + "s70_61baf5f1-de95-4c53-9121-b038a625748c.png",
    # Safe boxes
    "SAFE-101": BASE + "safe-101_c3cf6619-a849-44d9-ba5c-e56ed855f6b7.png",
    "SAFE-201": BASE + "safe-201_d295dbd7-31d0-4a65-aca7-0c7567f8b419.png",
    "SAFE-301": BASE + "safe-301_c3d50144-8cd8-48f9-b45b-c81f9c4cbe1a.png",
    # Smart Card Readers
    "K990": BASE + "k990_ce76f106-2f76-4b76-a350-deb631963ad3.jpg",
    "KR500-E": BASE + "kr500-e.png",
    "KR500-M": BASE + "kr500-m.png",
    "JS-500E": BASE + "js-500e.png",
    "JS-500M": BASE + "js-500m.png",
    "JS-33E": BASE + "js-33e_d0032249-9c18-44e3-a3ed-a8a981efb977.png",
    "JS-32E": BASE + "js-32e.png",
    "SA32-E": BASE + "sa32-e_88c70d17-7e39-45fb-97ad-bb03a479988a.png",
    "SA32-M": BASE + "sa32-m_80f2160e-7d09-4dd6-a1e8-e02ebe8f717d.png",
    "KR503-E": BASE + "kr503-e.png",
    "KR503-M": BASE + "kr503-m.png",
    "U12-I": BASE + "u12-i_4522fcae-5479-43d4-918c-380bbcef8511.png",
    "U5": BASE + "u5_79cb17b0-847a-44b7-91a8-8caf59db05fc.png",
    "U10": BASE + "u10_80a6bf31-26da-413e-b3c4-8100b81a611e.png",
    "UR10R-1F": BASE + "ur10r-1f_01cf7ff8-57ae-4716-b56a-39c50d4ce754.png",
    "U11-D": BASE + "u11-d_3a20bf4c-0c14-4710-b797-86fd56c00d89.png",
    "U14 UHF Reader": BASE + "u14-uhf_697110f0-f793-499f-a9aa-f1afa22488d2.png",
    "SC-405": BASE + "sc-405.jpg",
    "S990": BASE + "s990_e518eede-2dbf-4e78-892d-1e39d4180bc9.png",
    "SA40": BASE + "sa40_1ae87a6a-4123-4fe0-b428-acc202a66b3e.png",
    "JS34": BASE + "js34_17abf7a7-e769-4d76-b744-f19b07525926.png",
    # UHF Tags
    "UHF1-Tag1": BASE + "uhf1-tag1_9639573b-b5ea-48c7-9535-3ad18645b8ab.png",
    "UHF1-Tag3": BASE + "uhf1-tag3_45cd0216-d468-4bc1-8054-3203f0c23168.png",
    "UHF1-Tag4": BASE + "uhf1-tag4_7647ca2e-d7bc-477d-b8e6-cf70c7f9b50f.png",
    "UHF1-Tag5": BASE + "uhf1-tag5_ada95494-7f3d-4f12-8932-f9a360ed92dd.png",
    # Electromagnetic Locks
    "EML300-8-2": BASE + "eml300-8-2_d3659aa5-2d42-46f7-aeb3-0f6cd64a6f3d.png",
    "EML1200-8-5": BASE + "eml1200-8-5_cd5ea160-f149-486b-bef7-b75f7c4636cf.png",
    "EML600-8-2": BASE + "eml600-8-2_6675d28a-acc1-472c-8fa7-a47008276e97.jpg",
    "EML600-8-5": BASE + "eml600-8-5_2f3a9a6f-16df-4b66-9cdb-4b1084bdbfb0.jpg",
    "EML600D-8-2": BASE + "eml600d-8-2_48d944e7-ab7a-46ab-b51b-0da41f2e134f.jpg",
    "EML600D-8-5": BASE + "eml600d-8-5_69cd1fe9-82f0-40a7-8f40-8149132a7edb.jpg",
    # Exit buttons, door sensors
    "PUSH-9-RC": BASE + "push-9-rc_054c13b1-6d77-4036-8aad-50741155688b.jpg",
    "PUSH-9-SQ": BASE + "push-9-sq_4985ec77-4058-47ba-b9a0-b9daae5964b1.jpg",
    "JS-NOTOUCH-RC": BASE + "js-notouch-rc_28a308a6-ad0b-4c6c-a336-62e026c8cfbe.png",
    "JS-EXITBUTTON-CL": BASE + "js-exitbutton-cl_1462570c-3467-4b6f-8c9f-101fc7e98281.png",
    "DOORLOOP-U": BASE + "doorloop-u_ee964840-49fc-4628-97f1-03bc9f2443ae.png",
    "MRC-80": BASE + "mrc-80_d5fbf3ca-dfd3-4f66-926a-69d68bfac5f4.png",
    "FQR-80": BASE + "fqr-80_1c5a6e5b-df89-4d6a-b93b-20a217491727.png",
    "FQR-100": BASE + "fqr-100_f741135b-a830-4388-9d39-06abaadc84b5.png",
    # Mobile App Devices
    "MA-46E": BASE + "ma-46e.png",
    "JS-37E": BASE + "js-37e.png",
    "JS-36E": BASE + "js-36e.jpg",
    "JS-35E": BASE + "js-35e_ea579b4c-bae3-4dda-ba26-484d46e9cda7.jpg",
    "JS-39E": BASE + "js-39e.png",
    "JS-38E": BASE + "js-38e.png",
    # Guard Patrol
    "GP-FINGER-101": BASE + "gp-finger-101.jpg",
    "GP-RFID-102": BASE + "gp-rfid-102.jpg",
    "GP-FINGER-104": BASE + "gp-finger-104.png",
    "GP-RF-105": BASE + "gp-rf-105.png",
    # Thermal Printer
    "eSSL-SP-2 [Thermal Printer]": BASE + "essl-sp-2_493befd6-51c9-466e-bf2e-f85b4ef9820f.png",
    # UPS
    "IND-MINIUPS-12V": BASE + "ind-miniups-12v_2d14b048-ba0b-4df0-a1df-2747f5ff359d.jpg",
    "IND-UPS-12V-2200-MA": BASE + "ind-ups-12v-2200ma_0b9050dd-e581-4b4f-b226-b23364f9359e.jpg",
    # LPR Camera
    "eSSL LPR 100": BASE + "essl-lpr-100_f6225370-a815-4098-b515-ae40fd1b3950.png",
    # Baggage Scanners
    "eBS-5030A": BASE + "ebs-5030a_97751865-07ae-4f09-bd48-440ac1f58737.jpg",
    "eBS-5030A-N": BASE + "ebs-5030a-n_15660320-f3f9-4d91-9c00-d57698963546.png",
    "eBS6040C": BASE + "ebs6040c_1c74445b-da1d-4c85-97d3-15a2f4940207.png",
    "eBS6550C": BASE + "ebs6550c_2958e276-105b-475b-a29d-f61c6d7f0a5f.png",
    "eBS6550A": BASE + "ebs6550a.png",
    "eBS100100C": BASE + "ebs100100c.png",
    "eBS-6040A": BASE + "ebs-6040a.jpg",
    # Am System
    "SmartGuard RF": BASE + "smartguard-rf_e30d5aa9-daa2-4eaf-97e7-4ec9323ba519.png",
    "EAS-AM-88 M&S": BASE + "eas-am-88_2f8fc600-b6fb-4b05-806f-d0375ecd19ff.png",
    "EAM Detacher": BASE + "eam-detacher.png",
    "AM Hard Tag 1": BASE + "am-hard-tag-1.png",
    # Temperature scanners
    "TDM95": BASE + "tdm95_32479eeb-2a96-4757-aedc-3c2ca56d40bf.png",
    "TDM95E": BASE + "tdm95e_17aa00a5-906b-4315-a492-05054987f561.png",
    "ThermoAccess-9": BASE + "thermoaccess-9_ba5a2862-392f-4bed-9ff3-5a0e56ece1e5.png",
    # RFID Wristbands
    "ESSL-RFID WRISTBANDS": BASE + "essl-rfid-wristbands.png",  # will search
    "ESSL-IC WRISTBANDS": BASE + "essl-ic-wristbands.png",  # will search
    # SmartLife App
    "SmartLife - Smart Living App": BASE + "smartlife-app.png",  # will search
}

def load_env_file(env_path: Path) -> None:
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")

        if key and key not in os.environ:
            os.environ[key] = value


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower())
    return re.sub(r"-+", "-", slug).strip("-") or "product"


def parse_feature(feature: str) -> dict[str, str]:
    text = feature.strip()
    if not text:
        return {"title": "", "description": ""}

    for separator in (":", "=", "-"):
        if separator in text:
            title, description = text.split(separator, 1)
            title = title.strip()
            description = description.strip()
            if title and description:
                return {"title": title, "description": description}

    return {"title": text, "description": ""}


def summarize_specifications(specifications: Any) -> list[dict[str, str]]:
    if not isinstance(specifications, dict):
        return []

    rows: list[dict[str, str]] = []
    for section, values in specifications.items():
        if isinstance(values, list):
            joined_values = " | ".join(str(item).strip() for item in values if str(item).strip())
        else:
            joined_values = str(values).strip()

        if joined_values:
            rows.append({"label": str(section).strip(), "value": joined_values})

    return rows


def build_images(model_name: str, image_url: str, index: int) -> list[dict[str, str]]:
    alt_text = f"eSSL product image for {model_name}"

    if image_url != NULL_VALUE:
        return [{"url": image_url, "alt": alt_text}]

    return []


def build_document(entry: dict[str, Any], index: int) -> dict[str, Any]:
    product_name = str(entry.get("product_name", "")).strip()
    brand = str(entry.get("brand", "")).strip() or "eSSL"
    category = str(entry.get("category", "")).strip() or "Security Product"
    sub_category = str(entry.get("sub_category", "")).strip()
    model_name = str(entry.get("model_name", "")).strip() or product_name
    image_url = str(entry.get("image_url", NULL_VALUE)).strip() or NULL_VALUE
    slug_source = model_name or product_name or f"product-{index + 1}"
    slug = slugify(slug_source)
    features = [str(item).strip() for item in entry.get("features", []) if str(item).strip()]
    specifications = entry.get("specifications", {})
    images = build_images(model_name or product_name or slug, image_url, index + 1)
    summary = features[0] if features else f"{product_name or model_name} from {brand}."
    description = (
        f"{product_name or model_name} from {brand} for {sub_category or category} use. "
        f"Imported from the eSSL catalog."
    )

    return {
        "productName": product_name,
        "name": product_name or model_name,
        "modelName": model_name,
        "model": model_name or slug_source,
        "slug": slug,
        "url": f"/products/{slug}",
        "company": brand,
        "brand": brand,
        "description": description,
        "shortDescription": summary,
        "category": category,
        "subCategory": sub_category,
        "subCategories": [sub_category] if sub_category else [],
        "subCategory_1": sub_category,
        "subCategory_2": "",
        "image_url": image_url,
        "images": images,
        "featuredImage": image_url if image_url != NULL_VALUE else "",
        "galleryImages": [image["url"] for image in images],
        "highlights": features[:3],
        "features": [parse_feature(feature) for feature in features[:5]],
        "specs": summarize_specifications(specifications),
        "specifications": specifications,
        "applications": [],
        "benefits": [],
        "downloads": {
            "manual": "",
            "brochure": "",
            "datasheet": "",
        },
        "isFeatured": False,
        "isBestSeller": False,
        "isActive": True,
        "tags": [brand.lower(), category.lower(), slug],
        "sortOrder": index + 1,
    }


def get_database(client: MongoClient, database_name: str | None):
    if database_name:
        return client[database_name]

    try:
        return client.get_default_database()
    except Exception as exc:  # pragma: no cover - defensive fallback
        raise SystemExit("Could not determine the database name. Set MONGO_DB_NAME or include a database in MONGODB_URI.") from exc


def main() -> None:
    load_env_file(ENV_PATH)

    mongo_uri = os.environ.get("MONGODB_URI") or os.environ.get("MONGO_URI")
    if not mongo_uri:
        raise SystemExit("MONGODB_URI is not configured. Add it to backend/.env before running this script.")

    if not JSON_PATH.exists():
        raise SystemExit(f"Seed file not found: {JSON_PATH}")

    with JSON_PATH.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    if not isinstance(data, list):
        raise SystemExit("eSSL.json must contain a JSON array.")

    missing_models: list[str] = []
    for product in data:
        model = str(product.get("model_name", "")).strip()
        mapped_image = image_map.get(model, NULL_VALUE)
        product["image_url"] = mapped_image
        if mapped_image == NULL_VALUE:
            missing_models.append(model or "<unknown>")

    JSON_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    documents = [build_document(entry, index) for index, entry in enumerate(data)]
    database_name = os.environ.get("MONGO_DB_NAME") or os.environ.get("DB_NAME") or "test"

    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    try:
        database = get_database(client, database_name)
        collection = database[DEFAULT_COLLECTION]
        client.admin.command("ping")
        deleted_result = collection.delete_many({})
        inserted_result = collection.insert_many(documents) if documents else None
        inserted_count = len(inserted_result.inserted_ids) if inserted_result else 0

        print(f"Updated {len(data)} products in eSSL.json with image_url values.")
        print(f"Deleted {deleted_result.deleted_count} existing products from MongoDB.")
        print(f"Inserted {inserted_count} products into MongoDB.")
        print(f"Models without mapped images ({len(missing_models)}):")
        for model in missing_models:
            print(f"  - {model}")
    finally:
        client.close()


if __name__ == "__main__":
    main()