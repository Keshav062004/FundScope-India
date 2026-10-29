
from pathlib import Path
import argparse
import sys

from src.pipeline import run_pipeline


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Run the FundScope India data pipeline."
    )
    parser.add_argument(
        "--source",
        choices=["demo", "real"],
        default="real",
        help="Dataset to process: demo or real (default: real).",
    )
    args = parser.parse_args()

    root = Path(__file__).resolve().parent

    try:
        summary = run_pipeline(root, source=args.source)
        print("\nFundScope pipeline completed successfully.")
        for name, value in summary.items():
            print(f"- {name}: {value}")

        print("\nReview reports/current_dataset.json")
        print("Review reports/summary_insights.md")
    except Exception as exc:
        print(f"\nPipeline failed: {exc}", file=sys.stderr)
        raise
