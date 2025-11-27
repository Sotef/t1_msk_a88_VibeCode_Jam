import asyncio

from app.services.scibox_client import scibox_client


async def main() -> None:
    await scibox_client.check_health()


if __name__ == "__main__":
    asyncio.run(main())

