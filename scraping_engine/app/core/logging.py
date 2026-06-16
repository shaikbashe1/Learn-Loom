import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler

LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)


def setup_logging(name: str = "learnloom") -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)

    fmt = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s:%(lineno)d | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Console handler
    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(logging.INFO)
    ch.setFormatter(fmt)

    # Rotating file handler — general
    fh = RotatingFileHandler(
        LOG_DIR / "app.log", maxBytes=10 * 1024 * 1024, backupCount=5
    )
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(fmt)

    # Rotating file handler — errors only
    eh = RotatingFileHandler(
        LOG_DIR / "errors.log", maxBytes=5 * 1024 * 1024, backupCount=3
    )
    eh.setLevel(logging.ERROR)
    eh.setFormatter(fmt)

    logger.addHandler(ch)
    logger.addHandler(fh)
    logger.addHandler(eh)

    return logger


logger = setup_logging()
