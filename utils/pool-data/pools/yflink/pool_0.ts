import { ethers } from 'ethers'
import {
  ERC20_ABI,
  LINK_TOKEN_ADDR,
  YFL_POOL_0_ADDR,
  Y_STAKING_POOL_ABI,
} from '../../../../data/constants'
import { priceLookupService } from '../../../../services/price-lookup-service'
import { get_synth_weekly_rewards, toDollar, toFixed } from '../../../utils'
import { RiskLevel } from '../../../../types'

export default async function main(App) {
  const rewardTokenTicker = 'YFL'
  const stakingTokenTicker = 'LINK'

  const LINK_STAKING_POOL = new ethers.Contract(
    YFL_POOL_0_ADDR,
    Y_STAKING_POOL_ABI,
    App.provider
  )
  const LINK_TOKEN = new ethers.Contract(
    LINK_TOKEN_ADDR,
    ERC20_ABI,
    App.provider
  )

  const stakedAmount =
    (await LINK_STAKING_POOL.balanceOf(App.YOUR_ADDRESS)) / 1e18
  const earnedAmount = (await LINK_STAKING_POOL.earned(App.YOUR_ADDRESS)) / 1e18
  const totalStakedAmount = (await LINK_TOKEN.balanceOf(YFL_POOL_0_ADDR)) / 1e18

  // Find out reward rate
  const weeklyReward = await get_synth_weekly_rewards(LINK_STAKING_POOL)
  const rewardPerToken = weeklyReward / totalStakedAmount

  const {
    chainlink: stakingTokenPrice,
    yflink: rewardTokenPrice,
  } = await priceLookupService.getPrices(['chainlink', 'yflink'])

  const weeklyROI =
    (rewardPerToken * rewardTokenPrice * 100) / stakingTokenPrice

  return {
    provider: 'YFLink',
    name: 'LINK',
    poolRewards: [rewardTokenTicker],
    risk: {
      smartContract: RiskLevel.HIGH,
      impermanentLoss: RiskLevel.NONE,
    },
    apr: toFixed(weeklyROI * 52, 4),
    prices: [
      { label: stakingTokenTicker, value: toDollar(stakingTokenPrice) },
      { label: rewardTokenTicker, value: toDollar(rewardTokenPrice) },
    ],
    staking: [
      {
        label: 'Pool Total',
        value: toDollar(totalStakedAmount * stakingTokenPrice),
      },
      {
        label: 'Your Total',
        value: toDollar(stakedAmount * stakingTokenPrice),
      },
    ],
    rewards: [
      {
        label: `${toFixed(earnedAmount, 4)} ${rewardTokenTicker}`,
        value: toDollar(earnedAmount * rewardTokenPrice),
      },
    ],
    ROIs: [
      {
        label: 'Hourly',
        value: `${toFixed(weeklyROI / 7 / 24, 4)}%`,
      },
      {
        label: 'Daily',
        value: `${toFixed(weeklyROI / 7, 4)}%`,
      },
      {
        label: 'Weekly',
        value: `${toFixed(weeklyROI, 4)}%`,
      },
    ],
    links: [
      {
        title: 'Info',
        link: 'https://gov.yflink.io/t/mining-yfl-in-pool-0-link/24/2',
      },
      {
        title: 'Staking',
        link: 'https://yflink.io/#/',
      },
    ],
  }
}
